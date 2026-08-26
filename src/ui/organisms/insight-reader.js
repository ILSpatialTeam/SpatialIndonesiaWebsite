// Purnama — permukaan baca planet Insight.
//
// Bacaan tidak duduk di dalam panel. Ia mengambil alih layar, bulannya hadir
// besar di sisi kiri, dan fase bulan itu adalah progres bacamu: sabit di kalimat
// pertama, purnama di kalimat terakhir. Sparing tidak menumpuk di kaki halaman —
// tiap satelit bertambat ke paragraf tertentu dan terbit dari balik bulan tepat
// saat kamu sampai di sana.
//
// Seluruhnya dipasang ke document.body, di luar pohon React milik Design Canvas,
// supaya tidak ikut ter-render ulang.
import { ARTICLES, CATEGORIES, FREQ, SEED_SPARING } from '../../data/insight.js';
import { muatArtikel, kirimSparing, kirimBoost } from '../../data/remote.js';

const KEY = 'si.insight.v2';
const NARROW = 780;
const MIN_TEXT = 12, MAX_TEXT = 600;
const DONE_AT = 0.985;

/* ---------- simpanan ---------- */

const store = (() => {
  let s = { added: {}, boost: {}, boosted: {}, read: {}, pending: {}, name: '' };
  try { Object.assign(s, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* storage bisa dimatikan */ }
  const flush = () => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* abaikan */ } };
  return {
    list(slug) {
      return (SEED_SPARING[slug] || []).concat(s.added[slug] || [])
        .map(x => Object.assign({}, x, { boost: (x.boost || 0) + (s.boost[x.id] || 0) }))
        .sort((a, b) => (b.boost - a.boost) || (a.at < b.at ? 1 : -1));
    },
    add(slug, item) { (s.added[slug] = s.added[slug] || []).push(item); flush(); },
    // Satelit yang sudah dikirim tapi masih menunggu persetujuan admin.
    pending(id) { s.pending = s.pending || {}; s.pending[id] = 1; flush(); },
    isPending(id) { return !!(s.pending && s.pending[id]); },
    // Dicabut kalau server menolak kirimannya.
    drop(slug, id) {
      if (!s.added[slug]) return;
      s.added[slug] = s.added[slug].filter(x => x.id !== id);
      flush();
    },
    boost(id) { if (s.boosted[id]) return false; s.boosted[id] = 1; s.boost[id] = (s.boost[id] || 0) + 1; flush(); return true; },
    boosted(id) { return !!s.boosted[id]; },
    read(slug) { return !!s.read[slug]; },
    markRead(slug) { if (s.read[slug]) return false; s.read[slug] = Date.now(); flush(); return true; },
    purnama() { return Object.keys(s.read).length; },
    name(v) { if (v !== undefined) { s.name = v; flush(); } return s.name; }
  };
})();

/* ---------- util ---------- */

const el = (tag, attrs, kids) => {
  const n = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    if (k === 'class') n.className = attrs[k];
    else if (k === 'text') n.textContent = attrs[k];
    // `html` hanya dipakai untuk isi artikel, dan isi artikel sudah dibersihkan
    // di server sebelum masuk database (lihat shared/html.js di backend).
    // Teks dari pengunjung — nama dan isi sparing — tetap lewat `text`.
    else if (k === 'html') n.innerHTML = attrs[k];
    else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), attrs[k]);
    else if (attrs[k] !== null && attrs[k] !== undefined) n.setAttribute(k, attrs[k]);
  }
  (kids || []).forEach(c => c && n.appendChild(c));
  return n;
};
const svgEl = (tag, attrs) => {
  const n = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  return n;
};
const clamp01 = v => Math.min(1, Math.max(0, v));
const scene = () => document.querySelector('solar-system');
const art = slug => ARTICLES.find(a => a.slug === slug);
const cat = a => CATEGORIES[a.cat] || { label: 'Insight', color: '#a99bf2' };
const CODE = { teknis: 'TEK', desain: 'DSN', industri: 'IND', cerita: 'CRT' };

const FASE = p =>
  p < 0.06 ? 'CRESCENT' :
  p < 0.3 ? 'WAXING' :
  p < 0.46 ? 'FIRST QUARTER' :
  p < 0.76 ? 'GIBBOUS' :
  p < DONE_AT ? 'NEAR FULL' : 'FULL MOON';

function ago(iso) {
  const d = Math.round((Date.now() - new Date(iso + 'T00:00:00').getTime()) / 86400000);
  if (d <= 0) return 'today';
  if (d === 1) return 'yesterday';
  if (d < 30) return d + ' days ago';
  if (d < 365) return Math.round(d / 30) + ' months ago';
  return Math.round(d / 365) + ' years ago';
}
const tgl = iso => iso.split('-').reverse().join('.');
function tanggal(iso) {
  const B = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const d = new Date(iso + 'T00:00:00');
  return B[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
}
function jarak(a, b) {
  const gap = Math.abs(ARTICLES.indexOf(a) - ARTICLES.indexOf(b));
  return ((a.cat === b.cat ? 0.4 : 3.2) + gap * (a.cat === b.cat ? 0.3 : 1.1)).toFixed(1);
}

/* ---------- gaya ---------- */

const CSS = `
[data-panel="insight"] { display: none !important; }
html.pn-read [data-ui="flightplan"], html.pn-read [data-ui="readout"],
html.pn-read [data-ui="xrline"], html.pn-read [data-ui="hints"],
html.pn-read [data-ui="cursorpick"], html.pn-read [data-planet-label],
html.pn-read [data-ui="actiongroup"], html.pn-read [data-ui="brandtag"],
html.pn-read [data-ui="vignette"] { opacity: 0 !important; pointer-events: none !important; transition: opacity .6s; }

.pn-root {
  --ink: #08070c; --paper: #f4f2fa; --body: #d5d1e2; --muted: #837e93;
  --line: rgba(244,242,250,.13); --accent: #9E94F9;
  --serif: 'Newsreader', Georgia, 'Times New Roman', serif;
  --mono: 'IBM Plex Mono', ui-monospace, SFMono-Regular, monospace;
  position: fixed; inset: 0; z-index: 36; pointer-events: none; color: var(--paper);
}
.pn-root[data-view="none"] { display: none; }

/* -- selubung: gradien, bukan kotak panel -- */
.pn-scrim { position: absolute; inset: 0; opacity: 0; transition: opacity .7s; }
.pn-root[data-view="manifest"] .pn-scrim { opacity: 1; background: linear-gradient(90deg, rgba(8,7,12,0) 38%, rgba(8,7,12,.86) 56%, rgba(8,7,12,.96) 72%); }
.pn-root[data-view="read"] .pn-scrim { opacity: 1; background: linear-gradient(96deg, rgba(8,7,12,0) 26%, rgba(8,7,12,.5) 38%, rgba(8,7,12,.9) 52%, rgba(8,7,12,.97) 70%); }

/* -- menukik -- */
.pn-warp { position: fixed; inset: 0; z-index: 70; pointer-events: none; opacity: 0; }
.pn-warp .s { position: absolute; inset: -30%; background: repeating-conic-gradient(from 0deg at 50% 50%, rgba(255,255,255,0) 0deg 1.1deg, rgba(214,208,255,.5) 1.1deg 1.35deg); -webkit-mask-image: radial-gradient(circle at 50% 50%, transparent 8%, #000 34%, transparent 76%); mask-image: radial-gradient(circle at 50% 50%, transparent 8%, #000 34%, transparent 76%); }
.pn-warp .f { position: absolute; inset: 0; background: radial-gradient(circle at 50% 50%, rgba(255,255,255,.9), rgba(158,148,249,.25) 26%, transparent 60%); opacity: 0; }
.pn-warp.on { animation: pnWarp 1.45s cubic-bezier(.3,.6,.2,1) forwards; }
.pn-warp.on .s { animation: pnStreak 1.45s cubic-bezier(.3,.6,.2,1) forwards; }
.pn-warp.on .f { animation: pnFlash 1.45s ease-out forwards; }
@keyframes pnWarp { 0% { opacity: 0 } 16% { opacity: 1 } 76% { opacity: .85 } 100% { opacity: 0 } }
@keyframes pnStreak { 0% { transform: scale(.35) rotate(0deg) } 100% { transform: scale(3.4) rotate(9deg) } }
@keyframes pnFlash { 0%, 52% { opacity: 0 } 66% { opacity: .5 } 100% { opacity: 0 } }

/* teks yang menggulung ke atas harus larut sebelum menyentuh readout, tapi
   peredupnya tidak boleh menutupi bulan — jadi hanya sisi bacaan yang ditutup */
.pn-topfade { position: absolute; left: 28%; right: 0; top: 0; height: 104px; pointer-events: none; opacity: 0; transition: opacity .5s; background: linear-gradient(180deg, #08070c 34%, rgba(8,7,12,0)); -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 32%); mask-image: linear-gradient(90deg, transparent 0, #000 32%); }
.pn-root[data-view="read"] .pn-topfade { opacity: 1; }

.pn-links { position: absolute; inset: 0; pointer-events: none; }
.pn-links line { stroke: currentColor; stroke-width: 1; opacity: .5; }
.pn-links circle { fill: currentColor; }

/* -- manifes -- */
.pn-manifest { position: absolute; top: 0; right: 0; bottom: 0; width: min(620px, 50vw); padding: 92px 46px 40px 0; overflow-y: auto; pointer-events: auto; font-family: var(--mono); scrollbar-width: none; }
.pn-manifest::-webkit-scrollbar { display: none; }
.pn-root[data-view="read"] .pn-manifest { display: none; }
.pn-mhead { display: flex; align-items: baseline; gap: 14px; margin-bottom: 6px; font-size: 10.5px; letter-spacing: .26em; color: var(--muted); }
.pn-mhead b { color: var(--accent); font-weight: 400; }
.pn-x { margin-left: auto; border: 0; background: none; color: var(--muted); font: inherit; font-size: 13px; cursor: pointer; letter-spacing: 0; }
.pn-x:hover { color: var(--paper); }
.pn-mtitle { margin: 0 0 4px; font-family: var(--serif); font-weight: 400; font-size: 42px; line-height: 1; letter-spacing: -.02em; }
.pn-mline { margin: 0 0 26px; font-size: 10.5px; letter-spacing: .18em; color: var(--muted); }
.pn-filters { display: flex; flex-wrap: wrap; gap: 20px; margin-bottom: 4px; padding-bottom: 16px; font-size: 10.5px; letter-spacing: .2em; }
.pn-filters button { border: 0; background: none; padding: 0 0 4px; color: var(--muted); font: inherit; cursor: pointer; border-bottom: 1px solid transparent; }
.pn-filters button:hover { color: var(--body); }
.pn-filters button[aria-pressed="true"] { color: var(--paper); border-bottom-color: var(--accent); }

.pn-row { display: grid; grid-template-columns: 34px 34px 1fr; gap: 14px; width: 100%; padding: 17px 0 16px; border: 0; border-top: 1px solid var(--line); background: none; color: var(--paper); font: inherit; text-align: left; cursor: pointer; transition: padding-left .25s, background .25s; }
.pn-row:last-child { border-bottom: 1px solid var(--line); }
.pn-row:hover, .pn-row.hot { padding-left: 12px; background: linear-gradient(90deg, rgba(158,148,249,.1), transparent 60%); }
.pn-row .no, .pn-row .cd { font-size: 10.5px; letter-spacing: .1em; color: var(--muted); padding-top: 5px; }
.pn-row:hover .cd, .pn-row.hot .cd { color: var(--accent); }
.pn-row .t { display: block; font-family: var(--serif); font-size: 21px; font-weight: 400; line-height: 1.24; letter-spacing: -.01em; }
.pn-row .m { display: flex; align-items: baseline; gap: 8px; margin-top: 8px; font-size: 10px; letter-spacing: .16em; color: var(--muted); }
.pn-row .m i { font-style: normal; color: var(--accent); }
.pn-row .pu { margin-left: auto; color: #cbb26a; letter-spacing: .16em; }
.pn-sep { margin: 34px 0 0; padding-top: 4px; font-size: 10px; letter-spacing: .3em; color: var(--muted); }

/* -- dokumen -- */
.pn-doc { position: absolute; inset: 0; overflow-y: auto; overscroll-behavior: contain; pointer-events: none; scrollbar-width: none; opacity: 0; transition: opacity .55s ease .1s; }
.pn-doc::-webkit-scrollbar { display: none; }
.pn-root[data-view="read"] .pn-doc.lit { opacity: 1; }
.pn-root[data-view="manifest"] .pn-doc { display: none; }
.pn-col { margin: 15vh 0 46vh 46vw; width: min(60ch, calc(54vw - 9vw)); pointer-events: auto; }
.pn-eyebrow { margin: 0 0 22px; font-family: var(--mono); font-size: 10.5px; letter-spacing: .26em; color: var(--muted); }
.pn-eyebrow i { font-style: normal; color: var(--accent); }
.pn-h1 { margin: 0 0 20px; font-family: var(--serif); font-weight: 400; font-size: clamp(34px, 4.1vw, 58px); line-height: 1.04; letter-spacing: -.025em; color: #fbfaff; }
.pn-lead { margin: 0 0 30px; font-family: var(--serif); font-size: 21px; line-height: 1.6; font-style: italic; color: #b6b0c8; }
.pn-by { display: flex; gap: 16px; padding: 14px 0; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); font-family: var(--mono); font-size: 10.5px; letter-spacing: .16em; color: var(--muted); }

.pn-h2 { margin: 52px 0 16px; font-family: var(--serif); font-weight: 500; font-size: 27px; line-height: 1.22; letter-spacing: -.015em; color: #fbfaff; scroll-margin-top: 22vh; }
.pn-p { position: relative; margin: 0 0 20px; }
.pn-p > p { margin: 0; font-family: var(--serif); font-size: 20px; line-height: 1.78; color: var(--body); }
.pn-p > blockquote { margin: 30px 0; padding: 0; font-family: var(--serif); font-style: italic; font-size: 25px; line-height: 1.42; color: #efecf8; text-indent: -.4em; }
.pn-gut { position: absolute; left: -4.6rem; top: .5rem; width: 3.6rem; display: flex; flex-direction: column; align-items: flex-end; gap: 5px; }
.pn-mark, .pn-add { border: 0; background: none; padding: 0; font-family: var(--mono); font-size: 11px; letter-spacing: .06em; cursor: pointer; line-height: 1.4; white-space: nowrap; }
.pn-mark { color: var(--accent); }
.pn-mark:hover { text-decoration: underline; }
.pn-add { color: var(--muted); opacity: 0; transition: opacity .2s; }
.pn-p:hover .pn-add { opacity: 1; }
.pn-add:hover { color: var(--paper); }

.pn-thread { display: none; margin: 18px 0 26px; }
.pn-thread.open { display: block; }
.pn-sp { padding: 13px 0 13px 16px; border-left: 2px solid; margin-bottom: 10px; }
.pn-sp .r { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-bottom: 6px; font-family: var(--mono); font-size: 10px; letter-spacing: .16em; color: var(--muted); }
.pn-sp .r b { font-weight: 400; color: var(--paper); }
.pn-sp .r button { margin-left: auto; border: 0; background: none; color: var(--muted); font: inherit; cursor: pointer; letter-spacing: .1em; }
.pn-sp .r button:hover { color: var(--accent); }
.pn-sp .r button[disabled] { color: var(--accent); cursor: default; }
.pn-sp p { margin: 0; font-family: var(--serif); font-size: 17px; line-height: 1.62; color: #bdb8cb; }

.pn-form { padding: 18px 0 6px 16px; border-left: 2px solid var(--line); }
.pn-anchor { margin: 0 0 14px; font-family: var(--mono); font-size: 10px; letter-spacing: .16em; color: var(--muted); }
.pn-freqs { display: flex; flex-wrap: wrap; gap: 18px; margin-bottom: 10px; }
.pn-freqs button { display: flex; align-items: center; gap: 7px; border: 0; background: none; padding: 0 0 4px; color: var(--muted); font-family: var(--mono); font-size: 11px; letter-spacing: .14em; cursor: pointer; border-bottom: 1px solid transparent; }
.pn-freqs button:hover { color: var(--body); }
.pn-hint { min-height: 32px; margin: 0 0 12px; font-family: var(--serif); font-size: 15px; line-height: 1.5; color: var(--muted); }
.pn-in, .pn-ta { display: block; width: 100%; padding: 9px 0; border: 0; border-bottom: 1px solid var(--line); background: none; color: var(--paper); font-family: var(--serif); font-size: 17px; line-height: 1.6; }
.pn-in::placeholder, .pn-ta::placeholder { color: #55516a; }
.pn-in:focus, .pn-ta:focus { outline: none; border-bottom-color: var(--accent); }
.pn-ta { min-height: 86px; resize: vertical; }
.pn-foot { display: flex; align-items: center; gap: 16px; margin-top: 14px; font-family: var(--mono); font-size: 10px; letter-spacing: .16em; color: var(--muted); }
.pn-go { margin-left: auto; border: 1px solid var(--accent); background: none; padding: 9px 20px; color: var(--accent); font: inherit; letter-spacing: .2em; cursor: pointer; }
.pn-go:hover { background: var(--accent); color: var(--ink); }
.pn-go[disabled] { border-color: var(--line); color: #4d4960; cursor: not-allowed; background: none; }

.pn-end { margin: 64px 0 0; padding-top: 34px; border-top: 1px solid var(--line); opacity: .25; transition: opacity .8s; }
.pn-end.lit { opacity: 1; }
.pn-end h3 { margin: 0 0 12px; font-family: var(--serif); font-weight: 400; font-size: 46px; line-height: 1; letter-spacing: -.02em; color: #f6efd8; }
.pn-end p { margin: 0; font-family: var(--serif); font-size: 18px; line-height: 1.65; color: #b6b0c8; }
.pn-next { margin-top: 44px; }
.pn-nx { display: flex; align-items: baseline; gap: 18px; width: 100%; padding: 16px 0; border: 0; border-top: 1px solid var(--line); background: none; color: var(--paper); text-align: left; cursor: pointer; transition: padding-left .25s; }
.pn-nx:last-child { border-bottom: 1px solid var(--line); }
.pn-nx:hover { padding-left: 10px; }
.pn-nx .t { flex: 1 1 auto; font-family: var(--serif); font-size: 19px; line-height: 1.3; }
.pn-nx .ly { font-family: var(--mono); font-size: 10px; letter-spacing: .16em; color: var(--muted); }

/* -- telemetri fase -- */
.pn-tel { position: absolute; right: 46px; top: 38px; display: none; align-items: center; gap: 14px; font-family: var(--mono); font-size: 10.5px; letter-spacing: .22em; color: var(--muted); pointer-events: none; }
.pn-root[data-view="read"] .pn-tel { display: flex; }
.pn-tel .bar { position: relative; width: 132px; height: 1px; background: rgba(244,242,250,.16); }
.pn-tel .bar i { position: absolute; left: 0; top: 0; height: 1px; background: var(--accent); transition: width .12s linear; }
.pn-tel .pct { color: var(--body); }
.pn-back { position: absolute; left: 46px; top: 92px; display: none; border: 0; background: none; padding: 0; color: var(--muted); font-family: var(--mono); font-size: 10.5px; letter-spacing: .22em; cursor: pointer; pointer-events: auto; }
.pn-root[data-view="read"] .pn-back { display: block; }
.pn-back:hover { color: var(--paper); }

@media (max-width: ${NARROW - 1}px) {
  .pn-root[data-view="manifest"] .pn-scrim { background: linear-gradient(180deg, rgba(8,7,12,0) 8%, rgba(8,7,12,.9) 24%); }
  .pn-root[data-view="read"] .pn-scrim { background: linear-gradient(180deg, rgba(8,7,12,0) 4%, rgba(8,7,12,.55) 18%, rgba(8,7,12,.95) 34%); }
  .pn-manifest { width: auto; left: 0; padding: 26vh 20px 32px; }
  .pn-mtitle { font-size: 32px; }
  .pn-col { margin: 34vh 0 34vh; width: auto; padding: 0 20px; }
  .pn-h1 { font-size: 32px; }
  .pn-lead { font-size: 18px; }
  .pn-p > p { font-size: 18px; line-height: 1.72; }
  .pn-p > blockquote { font-size: 21px; }
  .pn-gut { position: static; width: auto; flex-direction: row; align-items: center; gap: 16px; margin-top: 9px; justify-content: flex-start; }
  .pn-add { opacity: 1; }
  /* Di layar sentuh, kolom teks tidak bisa jadi satu-satunya bidang yang
     menerima sentuhan: sapuan yang jatuh di margin atas/bawah tembus ke kanvas
     (touch-action: none) sehingga bacaan tidak ikut bergulir sama sekali. Saat
     membaca, seluruh layar diserahkan ke bacaan; memutar pandangan tetap bisa
     dilakukan setelah menutup artikel. */
  .pn-root[data-view="read"] .pn-doc { pointer-events: auto; touch-action: pan-y; -webkit-overflow-scrolling: touch; }
  /* telemetri fase pindah ke kaki layar — di atas ia bertabrakan dengan
     tombol kembali dan kepala situs */
  .pn-tel {
    right: 16px; left: 16px; top: auto; bottom: calc(12px + env(safe-area-inset-bottom));
    gap: 10px; padding: 9px 14px; font-size: 9.5px; letter-spacing: .14em;
    border: 1px solid var(--line); border-radius: 999px;
    background: rgba(8,7,12,.78); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
  }
  .pn-tel .bar { flex: 1 1 auto; width: auto; }
  .pn-topfade { left: 0; height: 76px; }
  .pn-back { left: 20px; top: 84px; padding: 6px 10px; margin: -6px -10px; border-radius: 999px; background: rgba(8,7,12,.6); }
  .pn-links { display: none; }
}
`;

/* ---------- kerangka ---------- */

const root = el('div', { class: 'pn-root', 'data-view': 'none' });
const scrim = el('div', { class: 'pn-scrim' });
const links = svgEl('svg', { class: 'pn-links' });
const manifest = el('div', { class: 'pn-manifest', 'data-insight-panel': 'manifest' });
const doc = el('div', { class: 'pn-doc' });
const topfade = el('div', { class: 'pn-topfade' });
const col = el('article', { class: 'pn-col' });
doc.appendChild(col);
const back = el('button', { class: 'pn-back', text: '← MANIFEST', onclick: () => { const s = scene(); if (s) s.travelTo('insight'); } });
const telBar = el('i');
const telName = el('span', { text: 'CRESCENT' });
const telPct = el('span', { class: 'pct', text: '0%' });
const tel = el('div', { class: 'pn-tel' }, [
  el('span', { text: 'PHASE' }), telName,
  el('span', { class: 'bar' }, [telBar]), telPct
]);
const warp = el('div', { class: 'pn-warp' }, [el('div', { class: 's' }), el('div', { class: 'f' })]);

root.append(scrim, links, manifest, doc, topfade, back, tel);
document.head.appendChild(el('style', { text: CSS }));
document.body.append(root, warp);

const view = v => root.setAttribute('data-view', v);
const current = () => root.getAttribute('data-view');
const narrow = () => innerWidth < NARROW;

/* ---------- manifes ---------- */

let filterCat = 'all';

function renderManifest() {
  manifest.replaceChildren();
  const total = ARTICLES.reduce((n, a) => n + store.list(a.slug).length, 0);
  const live = ARTICLES.filter(a => !a.archived);
  const arch = ARTICLES.filter(a => a.archived);
  const pick = arr => filterCat === 'all' ? arr : arr.filter(a => a.cat === filterCat);

  manifest.append(
    el('div', { class: 'pn-mhead' }, [
      el('span', { text: 'PLANET 04' }), el('b', { text: 'INSIGHT' }),
      el('button', { class: 'pn-x', text: 'CLOSE ✕', onclick: () => { const s = scene(); if (s) s.freeFlight(); } })
    ]),
    el('h2', { class: 'pn-mtitle', text: 'Orbit manifest' }),
    el('p', { class: 'pn-mline', text: live.length + ' ACTIVE MOONS · ' + total + ' SATELLITES · ' + store.purnama() + ' FULL MOONS COLLECTED' })
  );

  const f = el('div', { class: 'pn-filters' });
  [['all', 'ALL']].concat(Object.keys(CATEGORIES).map(k => [k, CATEGORIES[k].label.toUpperCase()]))
    .forEach(([id, label]) => f.appendChild(el('button', {
      'aria-pressed': String(filterCat === id), text: label,
      onclick: () => { filterCat = id; renderManifest(); }
    })));
  manifest.appendChild(f);

  const row = a => {
    const n = store.list(a.slug).length;
    const b = el('button', {
      class: 'pn-row', 'data-slug': a.slug,
      onclick: () => { const s = scene(); if (s) s.openArticle(a.slug); },
      onmouseenter: () => { const s = scene(); if (s) s.pinMoon(a.slug); },
      onmouseleave: () => { const s = scene(); if (s) s.pinMoon(null); }
    }, [
      el('span', { class: 'no', text: a.no }),
      el('span', { class: 'cd', text: CODE[a.cat] || '···' }),
      el('span', {}, [
        el('span', { class: 't', text: a.title }),
        el('span', { class: 'm' }, [
          el('span', {}, [el('i', { text: String(n) }), document.createTextNode(' SATELLITES')]),
          el('span', { text: '· ' + a.read + ' MIN · ' + tgl(a.date) }),
          store.read(a.slug) ? el('span', { class: 'pu', text: '● FULL MOON' }) : null
        ])
      ])
    ]);
    return b;
  };

  const shown = pick(live);
  if (!shown.length) manifest.appendChild(el('p', { class: 'pn-mline', style: 'margin-top:24px', text: 'NO MOONS IN THIS DISCIPLINE.' }));
  shown.forEach(a => manifest.appendChild(row(a)));

  const old = pick(arch);
  if (old.length) {
    manifest.appendChild(el('p', { class: 'pn-sep', text: '— ARCHIVE BELT' }));
    old.forEach(a => manifest.appendChild(row(a)));
  }
}

/* ---------- dokumen ---------- */

const R = { slug: null, paras: [], p: 0, done: false, openThread: null, hoverId: null, raf: 0 };

function sparingFor(slug, sec, par) {
  return store.list(slug).filter(s => s.anchor && s.anchor[0] === sec && s.anchor[1] === par);
}

function sparingCard(slug, s, refresh) {
  const f = FREQ[s.freq] || FREQ.sinyal;
  return el('div', {
    class: 'pn-sp', style: 'border-left-color:' + f.color, 'data-sid': s.id,
    onmouseenter: () => { R.hoverId = s.id; },
    onmouseleave: () => { if (R.hoverId === s.id) R.hoverId = null; }
  }, [
    el('div', { class: 'r' }, [
      el('span', { style: 'color:' + f.color, text: f.glyph + ' ' + f.label.toUpperCase() }),
      el('b', { text: s.name }),
      el('span', { text: ago(s.at).toUpperCase() }),
      s.mine ? el('span', { style: 'color:#5ad1c0', text: 'YOUR SATELLITE' }) : null,
      // Satelit yang menunggu moderasi hanya terlihat oleh pengirimnya. Diberi
      // tanda supaya ia tidak mengira orang lain sudah membacanya.
      store.isPending(s.id) ? el('span', { style: 'color:#f2a65a', text: 'AWAITING REVIEW' }) : null,
      el('button', {
        disabled: store.boosted(s.id) ? '' : null,
        text: (store.boosted(s.id) ? '↑ ' : '↑ BOOST ') + s.boost,
        onclick: () => {
          if (!store.boost(s.id)) return;
          refresh();
          // Dorongan lokal sudah tercatat dan tampil; kiriman ke server
          // menyusul. Gagal pun tidak ada yang perlu dibatalkan — angka ini
          // bukan sesuatu yang harus tepat sampai satuan terakhir.
          if (!String(s.id).startsWith('u')) kirimBoost(s.id).catch(() => {});
        }
      })
    ]),
    el('p', { text: s.text })
  ]);
}

function composeForm(slug, sec, par, paraText, refresh) {
  let freq = null;
  const hint = el('p', { class: 'pn-hint', text: 'Pick your frequency. The satellite\'s orbit shape follows your choice.' });
  const name = el('input', { class: 'pn-in', type: 'text', maxlength: '32', placeholder: 'Your name (optional)', value: store.name() });
  const ta = el('textarea', { class: 'pn-ta', maxlength: String(MAX_TEXT), placeholder: 'Write your response…' });
  const count = el('span', { text: '0 / ' + MAX_TEXT });
  const go = el('button', { class: 'pn-go', disabled: '', text: 'LAUNCH' });

  const btns = Object.keys(FREQ).map(k => el('button', {
    'data-f': k, 'aria-pressed': 'false',
    onclick: () => {
      freq = k;
      btns.forEach(b => {
        const on = b.dataset.f === k;
        b.style.color = on ? FREQ[k].color : '';
        b.style.borderBottomColor = on ? FREQ[k].color : 'transparent';
      });
      hint.textContent = FREQ[k].hint;
      sync();
    }
  }, [
    el('span', { style: 'color:' + FREQ[k].color, text: FREQ[k].glyph }),
    el('span', { text: FREQ[k].label.toUpperCase() })
  ]));

  const sync = () => {
    const n = ta.value.trim().length;
    count.textContent = n + ' / ' + MAX_TEXT;
    go.disabled = !(freq && n >= MIN_TEXT);
  };
  ta.addEventListener('input', sync);

  go.addEventListener('click', () => {
    const text = ta.value.trim();
    if (!freq || text.length < MIN_TEXT) return;
    const who = name.value.trim().slice(0, 32) || 'Anonymous';
    store.name(who);

    // Disimpan lokal lebih dulu supaya satelitnya langsung terbit — menunggu
    // jaringan sebelum ada yang bergerak di layar membuat aksinya terasa
    // gagal. Kalau server menolak, catatan lokal itu yang dicabut lagi.
    const id = 'u' + Date.now().toString(36);
    store.add(slug, {
      id, anchor: [sec, par], freq, name: who, text,
      at: new Date().toISOString().slice(0, 10), boost: 0, mine: true
    });
    ta.value = ''; sync();
    go.disabled = true; go.textContent = 'LAUNCHING…';
    const s = scene();
    const land = () => { go.textContent = 'LAUNCH'; sync(); refresh(true); };
    if (s && s.launchSparing) s.launchSparing(slug, freq, land); else land();

    kirimSparing(slug, { frequencyId: freq, authorName: who, text, anchor: [sec, par] })
      .then(hasil => {
        // Kalau moderasi menyala, satelit ini baru terlihat orang lain setelah
        // disetujui. Dikatakan apa adanya — "terkirim!" untuk sesuatu yang
        // belum tampil di mana pun adalah janji yang tidak ditepati.
        if (hasil && hasil.moderated) store.pending(id);
        refresh(true);
      })
      .catch(err => {
        store.drop(slug, id);
        refresh(true);
        console.warn('[spatial] sparing gagal dikirim:', err.message);
      });
  });

  const fr = el('div', { class: 'pn-freqs' });
  btns.forEach(b => fr.appendChild(b));
  return el('div', { class: 'pn-form' }, [
    el('p', { class: 'pn-anchor', text: '⌁ ANCHORED TO: “' + paraText.slice(0, 54).trim() + '…”' }),
    fr, hint, name, ta,
    el('div', { class: 'pn-foot' }, [count, go])
  ]);
}

function buildPara(a, sec, par, text, tag) {
  const wrap = el('div', { class: 'pn-p', 'data-sec': String(sec), 'data-par': String(par) });
  const thread = el('div', { class: 'pn-thread' });
  const gut = el('div', { class: 'pn-gut' });

  const refresh = (openIt) => {
    const list = sparingFor(a.slug, sec, par);
    gut.replaceChildren();
    if (list.length) {
      const top = FREQ[list[0].freq] || FREQ.sinyal;
      gut.appendChild(el('button', {
        class: 'pn-mark', style: 'color:' + top.color, text: top.glyph + ' ' + list.length,
        onmouseenter: () => { R.hoverId = 'para:' + sec + ':' + par; },
        onmouseleave: () => { if (R.hoverId === 'para:' + sec + ':' + par) R.hoverId = null; },
        onclick: () => { thread.classList.toggle('open'); if (thread.classList.contains('open')) fill(); }
      }));
    }
    gut.appendChild(el('button', {
      class: 'pn-add', text: '+ RESPOND',
      onclick: () => {
        thread.classList.add('open');
        fill(true);
        const t = thread.querySelector('textarea');
        if (t) t.focus();
      }
    }));
    if (openIt) { thread.classList.add('open'); fill(); }
    else if (thread.classList.contains('open')) fill();
    syncScene();
  };

  const fill = (withForm) => {
    const list = sparingFor(a.slug, sec, par);
    thread.replaceChildren();
    list.forEach(s => thread.appendChild(sparingCard(a.slug, s, () => refresh(true))));
    if (withForm !== false) thread.appendChild(composeForm(a.slug, sec, par, text, refresh));
  };

  wrap.append(gut, tag === 'blockquote' ? el('blockquote', { text: text }) : el('p', { html: text }), thread);
  refresh();
  return wrap;
}

async function openReader(slug) {
  const awal = art(slug);
  if (!awal) return;
  R.slug = slug; R.done = store.read(slug); R.p = 0;
  R.bodyEl = null; R.building = true;

  warp.classList.remove('on');
  void warp.offsetWidth;
  warp.classList.add('on');

  // Isi tulisan diambil per artikel, bukan ikut daftar: enam badan artikel
  // untuk satu yang dibaca adalah muatan yang tidak pernah terpakai. Animasi
  // warp di atas sudah berjalan, jadi pengambilannya bersembunyi di baliknya.
  const a = (await muatArtikel(slug).catch(() => null)) || awal;
  // Pembaca bisa keburu pindah bulan sementara permintaan berjalan. Kalau
  // begitu, hasil yang telat ini bukan lagi yang sedang dibuka.
  if (R.slug !== slug) return;

  const c = cat(a);
  col.replaceChildren();
  col.append(
    el('p', { class: 'pn-eyebrow' }, [
      document.createTextNode('MOON ' + a.no + ' · '),
      el('i', { text: c.label.toUpperCase() }),
      document.createTextNode(' · ' + a.read + ' MIN')
    ]),
    el('h1', { class: 'pn-h1', text: a.title }),
    el('p', { class: 'pn-lead', text: a.lead }),
    el('div', { class: 'pn-by' }, [
      el('span', { text: a.author.toUpperCase() }),
      el('span', { text: tanggal(a.date).toUpperCase() })
    ])
  );

  const body = el('div', { class: 'pn-body' });
  R.paras = [];
  // Isi bisa kosong kalau server tidak terjangkau dan artikel ini belum pernah
  // dibuka. Lebih jujur mengatakannya daripada memperlihatkan bulan purnama
  // di atas halaman kosong.
  if (!a.body || !a.body.length) {
    body.appendChild(el('p', { class: 'pn-lead', text: 'This article could not be loaded. Check your connection, then reopen the moon.' }));
  }
  (a.body || []).forEach((sec, si) => {
    if (sec.h) body.appendChild(el('h2', { class: 'pn-h2', text: sec.h }));
    sec.p.forEach((txt, pi) => {
      const w = buildPara(a, si, pi, txt);
      body.appendChild(w);
      R.paras.push({ sec: si, par: pi, elm: w });
    });
    if (sec.q) body.appendChild(buildPara(a, si, sec.p.length, sec.q, 'blockquote'));
  });
  col.appendChild(body);
  R.bodyEl = body;
  R.building = false;

  const end = el('div', { class: 'pn-end' + (R.done ? ' lit' : '') }, [
    el('h3', { text: 'Full Moon' }),
    el('p', { text: 'Orbit complete. This moon has entered your sky — ' + (store.purnama() + (R.done ? 0 : 1)) + ' full moons collected.' })
  ]);
  col.appendChild(end);
  R.endEl = end;

  const others = ARTICLES.filter(x => x.slug !== a.slug).sort((x, y) => parseFloat(jarak(a, x)) - parseFloat(jarak(a, y)));
  const nx = el('div', { class: 'pn-next' }, [el('p', { class: 'pn-sep', style: 'margin:0 0 4px', text: '— NEXT ORBIT' })]);
  [others[0], others[others.length - 1]].filter(Boolean).forEach(x => nx.appendChild(el('button', {
    class: 'pn-nx', onclick: () => { const s = scene(); if (s) s.openArticle(x.slug); }
  }, [
    el('span', { class: 't', text: x.title }),
    el('span', { class: 'ly', text: jarak(a, x) + ' LIGHT YRS' })
  ])));
  col.appendChild(nx);

  view('read');
  document.documentElement.classList.add('pn-read');
  doc.scrollTop = 0;
  doc.classList.remove('lit');
  setTimeout(() => { doc.classList.add('lit'); doc.scrollTop = 0; onScroll(); syncScene(); }, 820);
  requestAnimationFrame(() => { doc.scrollTop = 0; syncScene(); });
  startLinks();
}

function closeReader() {
  R.slug = null;
  document.documentElement.classList.remove('pn-read');
  doc.classList.remove('lit');
  stopLinks();
}

// beri tahu scene di titik mana tiap satelit harus terbit dari balik cakrawala
function syncScene() {
  const s = scene();
  if (!s || !R.slug || !R.bodyEl || R.building) return;
  s.setSparing(R.slug, store.list(R.slug));
  const top = R.bodyEl.offsetTop, h = Math.max(1, R.bodyEl.offsetHeight);
  const cues = {};
  R.paras.forEach(({ sec, par, elm }) => {
    const at = clamp01((elm.offsetTop + elm.offsetHeight * 0.5 - top) / h);
    sparingFor(R.slug, sec, par).forEach(sp => { cues[sp.id] = at; });
  });
  if (s.setSparingCues) s.setSparingCues(cues);
}

function onScroll() {
  if (current() !== 'read' || !R.bodyEl || !doc.clientHeight) return;
  const top = R.bodyEl.offsetTop, h = Math.max(1, R.bodyEl.offsetHeight);
  const p = clamp01((doc.scrollTop + doc.clientHeight * 0.62 - top) / h);
  R.p = p;
  const s = scene();
  if (s && s.setReadProgress) s.setReadProgress(p);
  telBar.style.width = (p * 100).toFixed(1) + '%';
  telPct.textContent = Math.round(p * 100) + '%';
  telName.textContent = FASE(p);

  if (p >= DONE_AT && !R.done) {
    R.done = true;
    store.markRead(R.slug);
    if (s && s.markRead) s.markRead(R.slug);
    if (R.endEl) R.endEl.classList.add('lit');
  }
}
doc.addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', () => { onScroll(); syncScene(); });

/* ---------- garis rambut ke satelit ---------- */

function drawLinks() {
  links.replaceChildren();
  const s = scene();
  if (s && R.hoverId && R.slug) {
    const ids = R.hoverId.startsWith('para:')
      ? (() => { const [, sec, par] = R.hoverId.split(':'); return sparingFor(R.slug, +sec, +par).map(x => x.id); })()
      : [R.hoverId];
    const src = R.hoverId.startsWith('para:')
      ? col.querySelector('.pn-p[data-sec="' + R.hoverId.split(':')[1] + '"][data-par="' + R.hoverId.split(':')[2] + '"] .pn-mark')
      : col.querySelector('.pn-sp[data-sid="' + R.hoverId + '"]');
    if (src) {
      const b = src.getBoundingClientRect();
      const x0 = b.left, y0 = b.top + b.height / 2;
      ids.forEach(id => {
        const q = s.satScreenPos && s.satScreenPos(id);
        if (!q) return;
        const f = FREQ[(store.list(R.slug).find(x => x.id === id) || {}).freq] || FREQ.sinyal;
        const g = svgEl('g', { color: f.color });
        g.appendChild(svgEl('line', { x1: x0 - 6, y1: y0, x2: q.x, y2: q.y }));
        g.appendChild(svgEl('circle', { cx: q.x, cy: q.y, r: 3 }));
        links.appendChild(g);
      });
    }
  }
  R.raf = requestAnimationFrame(drawLinks);
}
function startLinks() { if (!R.raf && !narrow()) R.raf = requestAnimationFrame(drawLinks); }
function stopLinks() { if (R.raf) cancelAnimationFrame(R.raf); R.raf = 0; links.replaceChildren(); }

/* ---------- kabel ke scene ---------- */

document.addEventListener('planet-focus', e => {
  const id = e.detail && e.detail.id;
  if (id === 'insight') { if (current() !== 'read') { renderManifest(); view('manifest'); } }
  else { closeReader(); view('none'); }
});
document.addEventListener('planet-free', () => { closeReader(); view('none'); });
document.addEventListener('insight-open', e => openReader(e.detail.slug));

// Artikel yang tinggal di Medium tidak punya isi untuk dibaca di sini. Panggung
// yang memutuskan (ia yang tahu bulan mana yang diklik) lalu memancarkan
// kejadian ini; membuka tab adalah urusan lapisan antarmuka, bukan three.js.
document.addEventListener('insight-external', e => {
  const { href } = e.detail || {};
  if (href) window.open(href, '_blank', 'noopener,noreferrer');
});
document.addEventListener('insight-close', () => { closeReader(); renderManifest(); view('manifest'); });
document.addEventListener('insight-hover', e => {
  const slug = e.detail && e.detail.slug;
  manifest.querySelectorAll('.pn-row').forEach(r => r.classList.toggle('hot', r.dataset.slug === slug));
});
document.addEventListener('ar-start', () => { closeReader(); root.style.display = 'none'; });
document.addEventListener('xr-end', () => { root.style.display = ''; });

function seed() {
  const s = scene();
  if (!s || !s.setSparing) return;
  ARTICLES.forEach(a => {
    s.setSparing(a.slug, store.list(a.slug));
    if (store.read(a.slug)) s.markRead(a.slug);
  });
}
document.addEventListener('scene-ready', () => setTimeout(seed, 0));
setTimeout(seed, 1200);

/* ---------- input ---------- */

// di luar kolom teks, pointer diserahkan ke kanvas supaya kamu tetap bisa menoleh;
// roda mouse di sana tetap harus menggulung bacaan, bukan menarik zoom kamera
addEventListener('wheel', e => {
  if (current() !== 'read') return;
  if (e.target && e.target.closest && e.target.closest('.pn-col')) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  doc.scrollTop += e.deltaY;
}, { capture: true, passive: false });

// scene mengikat 1–6 dan Escape ke navigasi; jangan sampai itu memakan ketikan
addEventListener('keydown', e => {
  const t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) {
    if (e.key === 'Escape') t.blur();
    e.stopImmediatePropagation();
    return;
  }
  if (current() !== 'read') return;
  if (e.key === 'Escape') {
    e.stopImmediatePropagation();
    const s = scene();
    if (s) s.travelTo('insight');
  } else if (e.key === ' ' || e.key === 'PageDown' || e.key === 'PageUp' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    e.stopImmediatePropagation();
    const step = e.key === 'ArrowDown' ? 90 : e.key === 'ArrowUp' ? -90 : doc.clientHeight * 0.82;
    doc.scrollBy({ top: e.key === 'PageUp' ? -step : step, behavior: 'smooth' });
  }
}, true);

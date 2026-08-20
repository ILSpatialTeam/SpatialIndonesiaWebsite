// Organisme: papan misi.
//
// Judul identitas plus satu hal yang benar-benar dicari orang: kapan pertemuan
// berikutnya. Tertutup saat halaman dibuka — yang pertama dilihat orang harus
// tata suryanya, bukan blok teks.
import { el } from '../atoms/el.js';
import { scene } from '../../core/dom.js';
import { signal } from './signals.js';
import { agendaState } from '../../data/agenda.js';
import { PRESENCE } from '../../data/agenda.js';

export const css = `/* -- papan misi --
   Sengaja tertutup saat halaman dibuka: yang pertama dilihat orang harus tata
   suryanya, bukan blok teks. Ia dipanggil lewat tombol, tampil rendah di kaki
   layar supaya tidak menutup matahari, lalu pergi lagi. */
.hud-hero {
  position: absolute; left: 50%; bottom: 24px; transform: translateX(-50%) translateY(20px);
  width: min(600px, calc(100vw - 48px)); text-align: center;
  opacity: 0; pointer-events: none; transition: opacity .4s ease, transform .55s cubic-bezier(.2,.7,.2,1);
}

.hud-hero.open { opacity: 1; transform: translateX(-50%); pointer-events: auto; }

.hud-hero.open.away { opacity: 0; transform: translateX(-50%) translateY(14px); pointer-events: none; }

/* Kerlipnya menempel pada kotak judul dengan posisi persen, jadi ia ikut
   apa pun lebar layarnya — tidak seperti busur berkoordinat tetap yang dulu
   melenceng begitu layarnya menyempit. */
.hud-hero h1 { position: relative; margin: 0 0 12px; font-family: 'Poppins', sans-serif; font-weight: 600; font-size: 38px; line-height: 1.08; letter-spacing: -.015em; }

.hud-hero .spark {
  position: absolute; left: var(--x); top: var(--y);
  width: var(--s); height: var(--s); margin: calc(var(--s) / -2) 0 0 calc(var(--s) / -2);
  background: #f8f6ff; opacity: 0; pointer-events: none;
  filter: drop-shadow(0 0 7px rgba(200,190,255,.95));
  clip-path: polygon(50% 0%, 59% 41%, 100% 50%, 59% 59%, 50% 100%, 41% 59%, 0% 50%, 41% 41%);
}

.hud-hero.open .spark { animation: heroTwinkle 3.6s ease-in-out infinite; animation-delay: var(--d); }

.hud-hero h1 span {
  display: inline-block; opacity: 0;
  background-image: linear-gradient(96deg, #b9b0ff 0%, #f6f4ff 24%, #ffffff 33%, #d3ccff 48%, #a99bf2 66%, #cfc9ff 100%);
  background-size: 320% 100%; background-position: 100% 0;
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent; color: transparent;
}

.hud-hero.open h1 span {
  animation: heroWord .6s cubic-bezier(.2,.7,.2,1) both, heroSheen 1.5s cubic-bezier(.3,.6,.2,1) both;
  animation-delay: calc(var(--i) * .075s), calc(.22s + var(--i) * .075s);
}

/* satu baris agenda: kabar yang dicari orang, bukan paragraf pengantar */
.hud-hero .agenda { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 8px 14px; }

.hud-hero .kicker { display: inline-flex; align-items: center; gap: 7px; font-family: var(--hud-mono); font-size: 8.5px; letter-spacing: .24em; color: var(--hud-mint); }

.hud-hero .kicker i { width: 6px; height: 6px; border-radius: 50%; background: var(--hud-mint); box-shadow: 0 0 10px rgba(169,155,242,.9); animation: hudBeat 2.4s ease-in-out infinite; }

.hud-hero .ev { font-family: 'Poppins', sans-serif; font-size: 14.5px; }

.hud-hero .meta { font-family: var(--hud-mono); font-size: 9px; letter-spacing: .14em; color: var(--hud-muted); }

.hud-hero .meta b { font-weight: 400; color: var(--hud-paper); }

/* kembaran dua dimensi dari busur di orbit Event */
.hud-hero .track { position: relative; width: 74px; height: 1px; background: rgba(243,242,248,.16); }

.hud-hero .track i { position: absolute; left: 0; top: 0; height: 1px; background: linear-gradient(90deg, transparent, var(--hud-mint)); }

.hud-hero .track b { position: absolute; top: 50%; width: 6px; height: 6px; margin: -3px 0 0 -3px; border-radius: 50%; background: var(--hud-paper); box-shadow: 0 0 9px rgba(243,242,248,.8); }

.hud-hero .track s { position: absolute; right: -1px; top: -3px; width: 1px; height: 7px; background: var(--hud-iris); }

.hud-hero .acts { display: inline-flex; align-items: center; gap: 8px; }

.hud-hero .go, .hud-card .go {
  display: inline-flex; align-items: center; gap: 8px; padding: 8px 15px; border: 0; border-radius: 999px;
  background: rgba(158,148,249,.14); box-shadow: inset 0 0 0 1px rgba(158,148,249,.4);
  color: var(--hud-paper); font-family: var(--hud-mono); font-size: 9px; letter-spacing: .16em; cursor: pointer;
  transition: background .2s, box-shadow .2s;
}

.hud-hero .go:hover, .hud-card .go:hover { background: rgba(158,148,249,.26); box-shadow: inset 0 0 0 1px rgba(158,148,249,.7), 0 0 24px rgba(106,90,224,.3); }

.hud-hero .go.ghost, .hud-card .go.ghost { background: transparent; box-shadow: inset 0 0 0 1px rgba(243,242,248,.14); color: var(--hud-muted); }

.hud-hero .go.ghost:hover, .hud-card .go.ghost:hover { color: var(--hud-paper); box-shadow: inset 0 0 0 1px rgba(243,242,248,.3); }

.hud-hero .presence { margin-top: 11px; font-family: var(--hud-mono); font-size: 8px; letter-spacing: .2em; color: var(--hud-dim); }

@keyframes heroTwinkle {
  0%, 100% { opacity: 0; transform: scale(.35) rotate(0deg); }
  10% { opacity: 1; transform: scale(1) rotate(30deg); }
  26% { opacity: .3; transform: scale(.7) rotate(52deg); }
  40% { opacity: .95; transform: scale(.92) rotate(74deg); }
  62% { opacity: 0; transform: scale(.35) rotate(96deg); }
}

@keyframes heroWord { from { opacity: 0; transform: translateY(16px) scale(.96); filter: blur(7px); } to { opacity: 1; transform: none; filter: none; } }

@keyframes heroSheen { from { background-position: 100% 0; } to { background-position: 0 0; } }

@media (max-width: 1100px) and (min-width: 780px) {
  .hud-hero { width: min(470px, calc(100vw - 320px)); bottom: 24px; }
  .hud-hero h1 { font-size: 29px; }
}

@media (max-width: 779px) {
  /* di layar ponsel hero harus berhenti di atas strip navigasi dan tombol
       panduan; kalimat pengantar dan baris jejak dilepas supaya yang tersisa
       justru bagian yang berguna: pertemuan berikutnya */
    /* papan misi berhenti di atas strip navigasi; busurnya diperkecil utuh
       supaya titik yang meluncur tetap menempel pada lintasannya */
    .hud-hero { bottom: calc(172px + env(safe-area-inset-bottom)); width: calc(100vw - 28px); }
  .hud-hero h1 { font-size: 24px; margin-bottom: 10px; }
  .hud-hero .presence { display: none; }
  .hud-hero .agenda { gap: 6px 10px; }
  .hud-hero .ev { font-size: 13px; }
  .hud-hero .meta { font-size: 8px; letter-spacing: .1em; }
  .hud-hero .track { display: none; }
  .hud-hero .go { padding: 7px 12px; font-size: 8px; letter-spacing: .12em; }
}`;

let btnRef = null;
export function mountButton(btn) {
  btnRef = btn;
  // kunjungan pertama: tombolnya berdenyut sebentar, bukan papannya yang
  // memaksa muncul — undangan, bukan interupsi
  if (!localStorage.getItem('si.board')) {
    btn.classList.add('invite');
    setTimeout(() => {
      btn.classList.remove('invite');
      try { localStorage.setItem('si.board', 'seen'); } catch (e) { /* boleh gagal */ }
    }, 9000);
  }
}

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const tanggal = iso => {
  const [y, m, d] = iso.split('-').map(Number);
  return d + ' ' + BULAN[m - 1] + ' ' + y;
};

const evName = el('span', { class: 'ev', text: '—' });
const evMeta = el('span', { class: 'meta' });
const trackFill = el('i'), trackDot = el('b');
const track = el('span', { class: 'track' }, [trackFill, trackDot, el('s')]);
const presence = el('div', { class: 'presence' });
const goEvent = el('button', { class: 'go', text: 'TERBANG KE TITIK TEMU', onclick: () => { const s = scene(); if (s) s.travelTo('event'); } });
const goCal = el('button', { class: 'go ghost', text: '+ KALENDER', onclick: () => saveIcs() });


// judul dipecah per kata: tiap kata naik sendiri lalu dilewati kilau cahaya
const TITLE = 'Jelajahi tata surya spatial'.split(' ');
const title = el('h1', {}, TITLE.map((w, i) => el('span', { style: '--i:' + i, text: w })));
TITLE.forEach((w, i) => { if (i) title.insertBefore(document.createTextNode(' '), title.children[i]); });

// bintang kecil yang berkelip di atas hurufnya sendiri
[
  ['6%', '-2%', 11, '0s'], ['38%', '-16%', 8, '1.1s'], ['72%', '-8%', 13, '.5s'],
  ['92%', '46%', 9, '1.8s'], ['24%', '88%', 8, '2.4s'], ['61%', '92%', 10, '3s']
].forEach(([x, y, size, d]) => {
  title.appendChild(el('span', { class: 'spark', style: '--x:' + x + ';--y:' + y + ';--s:' + size + 'px;--d:' + d }));
});

export const node = el('div', { class: 'hud-hero', 'data-hud-el': 'hero' }, [
  title,
  el('div', { class: 'agenda' }, [
    el('span', { class: 'kicker' }, [el('i'), el('span', { text: 'PERTEMUAN BERIKUTNYA' })]),
    evName, evMeta, track,
    el('span', { class: 'acts' }, [goEvent, goCal])
  ]),
  presence
]);

let boardOpen = false;
export const toggleBoard = force => {
  boardOpen = force === undefined ? !boardOpen : !!force;
  node.classList.toggle('open', boardOpen);
  if (btnRef) btnRef.classList.toggle('on', boardOpen);
  if (boardOpen) {
    if (btnRef) btnRef.classList.remove('invite');
    try { localStorage.setItem('si.board', 'seen'); } catch (e) { /* boleh gagal */ }
  }
};

let agendaNow = null;
export const paint = st => {
  if (!st) return;
  agendaNow = st;
  if (!st.next) return;
  evName.textContent = st.next.title;
  evMeta.replaceChildren(
    el('b', { text: tanggal(st.next.date).toUpperCase() }),
    el('span', { text: ' · ' + st.next.place.toUpperCase() + ' · ' }),
    el('b', { text: st.days === 0 ? 'HARI INI' : st.days + ' HARI LAGI' })
  );
  const pct = Math.round(st.progress * 100);
  trackFill.style.width = pct + '%';
  trackDot.style.left = pct + '%';
};

export const paintPresence = () => {
  const recent = PRESENCE.filter(v => v.ago <= 120).length || PRESENCE.length;
  presence.textContent = recent + ' PENJELAJAH LEWAT DALAM 2 JAM TERAKHIR';
};

// Undangan kalender dibuat di sisi klien: satu berkas .ics, tanpa server.
export const saveIcs = ev => {
  const st = agendaNow || agendaState();
  const item = ev || (st && st.next);
  if (!item) return;
  const d = item.date.replace(/-/g, '');
  const body = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Spatial Indonesia//Orbit//ID',
    'BEGIN:VEVENT',
    'UID:' + item.id + '@spatialindonesia',
    'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z',
    'DTSTART;VALUE=DATE:' + d,
    'SUMMARY:' + item.title,
    'LOCATION:' + item.place,
    'DESCRIPTION:' + (item.note || 'Spatial Indonesia'),
    'END:VEVENT', 'END:VCALENDAR'
  ].join('\r\n');
  const url = URL.createObjectURL(new Blob([body], { type: 'text/calendar' }));
  const a = el('a', { href: url, download: item.id + '.ics' });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  signal('Undangan ' + item.title + ' tersimpan ke kalendermu.');
};

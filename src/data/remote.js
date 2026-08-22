// Seam menuju API. Modul inilah yang mengubah `src/data/*` dari fakta tetap
// jadi fakta yang datang dari server — tanpa satu pun berkas di `systems/`,
// `scene/`, atau `ui/` perlu tahu.
//
// ── Kenapa isi modul data lama dimutasi, bukan diganti ─────────────────────
//
// Belasan berkas sudah menulis `import { PLANETS } from '../data/planets.js'`.
// Impor ES mengikat *binding*, dan sebuah array yang diimpor akan selalu array
// yang sama — jadi mengisi ulang isinya di tempat membuat semua pengimpor itu
// melihat data baru tanpa satu baris pun diubah. Menggantinya dengan
// `PLANETS = hasil` mustahil (binding impor bersifat baca-saja) dan mengubah
// semuanya jadi fungsi berarti menyentuh setiap berkas.
//
// ── Kenapa cache dibaca sinkron saat modul dievaluasi ──────────────────────
//
// `main.js` mengimpor berkas ini paling awal, dan evaluasi modul ES bersifat
// berurutan: apa pun yang dikerjakan di sini selesai sebelum `solar-system.js`
// mulai dievaluasi. Artinya kunjungan kedua membangun tata surya langsung dari
// data terbaru — nol permintaan jaringan sebelum bingkai pertama.
//
// Kunjungan pertama tetap memakai data bawaan di berkas, lalu diperbarui saat
// respons datang. Pilihan yang sama dengan `skinTexture()`: tampilkan dulu apa
// yang ada, perbaiki begitu yang benar tiba. Kalau backend mati, situsnya tetap
// utuh — cuma isinya yang tidak paling baru.
import { PLANETS, PLANET_ICONS, NAV } from './planets.js';
import { PANELS } from './panels.js';
import { ARTICLES, CATEGORIES, FREQ, SEED_SPARING } from './insight.js';
import { AGENDA, PRESENCE } from './agenda.js';

const META = document.querySelector('meta[name="spatial-api"]');
export const API = (META?.content || '/api/v1').replace(/\/+$/, '');

const KUNCI = 'spatial.bootstrap.v1';
const KADALUARSA = 7 * 86400000;   // cache lebih tua dari ini diabaikan

// ── HTML artikel → blok yang dimengerti pembaca ─────────────────────────────
//
// Pembaca artikel menandai sparing dengan pasangan (indeks bagian, indeks
// paragraf), jadi ia butuh isi tulisan dalam bentuk berblok — bukan satu
// gumpalan HTML. Editor WYSIWYG menghasilkan gumpalan. Fungsi ini jembatannya.
//
// Isi setiap paragraf tetap HTML (sudah disanitasi server), bukan teks polos,
// supaya huruf tebal dan tautan yang ditulis penulis tidak hilang di jalan.
const BLOK_JUDUL = new Set(['H1', 'H2', 'H3', 'H4']);

export function htmlKeBlok(html) {
  if (!html) return [];
  const doc = new DOMParser().parseFromString(`<div id="r">${html}</div>`, 'text/html');
  const akar = doc.getElementById('r');
  const blok = [];
  let kini = null;

  const pastikan = () => {
    if (!kini) { kini = { h: '', p: [], q: '' }; blok.push(kini); }
    return kini;
  };

  for (const n of akar.children) {
    if (BLOK_JUDUL.has(n.tagName)) {
      kini = { h: n.textContent.trim(), p: [], q: '' };
      blok.push(kini);
    } else if (n.tagName === 'BLOCKQUOTE') {
      // Satu bagian hanya menampung satu kutipan (itu bentuk yang dipahami
      // pembaca). Kutipan kedua dijadikan paragraf biasa daripada dibuang.
      const s = pastikan();
      if (s.q) s.p.push(n.innerHTML.trim());
      else s.q = n.textContent.trim();
    } else if (n.tagName === 'UL' || n.tagName === 'OL') {
      const s = pastikan();
      for (const li of n.children) s.p.push(`• ${li.innerHTML.trim()}`);
    } else if (n.tagName === 'HR') {
      kini = null;   // pemisah memulai bagian baru tanpa judul
    } else {
      const isi = n.innerHTML.trim();
      if (isi) pastikan().p.push(isi);
    }
  }
  return blok.filter((s) => s.h || s.p.length || s.q);
}

// ── penerapan muatan ────────────────────────────────────────────────────────
const isiUlang = (arr, baru) => { arr.length = 0; arr.push(...baru); return arr; };
const isiUlangObj = (obj, baru) => {
  for (const k of Object.keys(obj)) delete obj[k];
  Object.assign(obj, baru);
  return obj;
};

export function terapkan(muatan) {
  if (!muatan) return false;

  if (muatan.planets?.length) isiUlang(PLANETS, muatan.planets);
  if (muatan.icons) isiUlangObj(PLANET_ICONS, muatan.icons);
  // NAV dihitung dari PLANETS saat modul dimuat, jadi ia tidak ikut berubah
  // sendiri — harus diisi ulang terpisah. Persis jenis kaitan tersembunyi yang
  // gampang terlewat saat data berpindah ke server.
  if (muatan.nav?.length) isiUlang(NAV, muatan.nav);

  if (muatan.panels) {
    isiUlangObj(
      PANELS,
      Object.fromEntries(
        Object.entries(muatan.panels).map(([id, p]) => [
          id,
          { no: p.no, tag: p.tag, accent: p.accent, title: p.title, lead: p.lead,
            bodyHtml: p.bodyHtml, items: p.items ?? [], links: p.links ?? [] }
        ])
      )
    );
  }

  if (muatan.categories) isiUlangObj(CATEGORIES, muatan.categories);
  if (muatan.frequencies) isiUlangObj(FREQ, muatan.frequencies);

  if (muatan.articles) {
    isiUlang(
      ARTICLES,
      muatan.articles.map((a) => ({
        ...a,
        // `body` diisi belakangan saat artikelnya dibuka: daftar dari server
        // sengaja tidak membawa isi tulisan, dan memuat enam badan artikel
        // untuk satu yang dibaca adalah pemborosan yang paling terasa di
        // sambungan seluler.
        body: []
      }))
    );
  }

  if (muatan.sparing) isiUlangObj(SEED_SPARING, muatan.sparing);
  if (muatan.agenda?.length) isiUlang(AGENDA, muatan.agenda);

  return true;
}

// ── cache ───────────────────────────────────────────────────────────────────
let etag = null;

export function bacaCache() {
  try {
    const mentah = localStorage.getItem(KUNCI);
    if (!mentah) return null;
    const { at, etag: e, muatan } = JSON.parse(mentah);
    if (!at || Date.now() - at > KADALUARSA) return null;
    etag = e ?? null;
    return muatan;
  } catch {
    // Penyimpanan bisa dimatikan atau penuh. Bukan alasan situsnya gagal.
    return null;
  }
}

const tulisCache = (muatan, e) => {
  try {
    localStorage.setItem(KUNCI, JSON.stringify({ at: Date.now(), etag: e, muatan }));
  } catch { /* kuota penuh — cache memang boleh gagal */ }
};

// Dijalankan saat modul dievaluasi, sebelum panggung dibangun.
export const dariCache = terapkan(bacaCache());

// ── jaringan ────────────────────────────────────────────────────────────────
const ambil = async (jalur, opsi = {}) => {
  const res = await fetch(API + jalur, { credentials: 'omit', ...opsi });
  if (res.status === 304) return { tidakBerubah: true };
  const teks = await res.text();
  const data = teks ? JSON.parse(teks) : null;
  if (!res.ok) throw Object.assign(new Error(data?.error?.message || `Gagal (${res.status})`), {
    status: res.status, code: data?.error?.code, details: data?.error?.details
  });
  return { data, etag: res.headers.get('etag') };
};

export async function segarkan() {
  try {
    const hasil = await ambil('/bootstrap', { headers: etag ? { 'If-None-Match': etag } : {} });
    // 304 berarti cache yang sudah diterapkan memang yang terbaru — tidak ada
    // yang perlu digambar ulang, dan itu justru jalur tercepatnya.
    if (hasil.tidakBerubah) return false;

    terapkan(hasil.data);
    etag = hasil.etag;
    tulisCache(hasil.data, hasil.etag);
    document.dispatchEvent(new CustomEvent('data-ready', { detail: { sumber: 'jaringan' } }));
    return true;
  } catch (err) {
    // Backend mati bukan kegagalan halaman. Data bawaan sudah terpasang, tata
    // suryanya tetap jalan, dan yang hilang cuma kemutakhiran.
    console.warn('[spatial] data terbaru tidak bisa diambil:', err.message);
    return false;
  }
}

// Jejak kehadiran tidak ikut /bootstrap — isinya berubah tiap kunjungan, dan
// menggabungkannya akan membuat seluruh muatan itu tidak bisa di-cache.
export async function segarkanJejak() {
  try {
    const { data } = await ambil('/presence');
    if (Array.isArray(data) && data.length) {
      isiUlang(PRESENCE, data);
      document.dispatchEvent(new CustomEvent('presence-ready'));
    }
  } catch { /* jejak contoh tetap dipakai */ }
}

// ── kiriman pengunjung ──────────────────────────────────────────────────────
const kirim = (jalur, badan) =>
  ambil(jalur, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(badan)
  }).then((r) => r.data);

export const kirimSparing = (slug, isi) => kirim(`/articles/${slug}/sparing`, isi);
export const kirimBoost = (id) => kirim(`/sparing/${id}/boost`, {});
export const kirimGabung = (isi) => kirim('/join', isi);

// Jembatan untuk lapisan template.
//
// Formulir Gabung hidup di dalam komponen Design Canvas di `index.html`, dan
// blok <script type="text/x-dc"> di sana bukan modul ES — ia tidak bisa
// mengimpor apa pun. Satu objek global adalah satu-satunya jalan yang tersisa,
// jadi dibuat sesempit mungkin: hanya fungsi yang memang dibutuhkan template,
// bukan seluruh isi modul ini.
if (typeof window !== 'undefined') {
  window.SpatialAPI = Object.freeze({ join: (isi) => kirimGabung(isi) });
}
export const catatJejak = (path) => kirim('/presence', { path }).catch(() => null);

// Isi satu artikel, diambil saat bulannya dibuka. Hasilnya ditanam ke entri
// ARTICLES yang sudah ada supaya pembaca bisa membacanya seperti biasa.
export async function muatArtikel(slug) {
  const entri = ARTICLES.find((a) => a.slug === slug);
  if (entri?.body?.length) return entri;             // sudah pernah dibuka
  if (entri?.external) return entri;                 // isinya memang di Medium
  const { data } = await ambil(`/articles/${encodeURIComponent(slug)}`);
  if (!data) return entri;
  const blok = htmlKeBlok(data.bodyHtml);
  if (entri) {
    Object.assign(entri, data, { body: blok });
  } else {
    ARTICLES.push({ ...data, body: blok });
  }
  if (data.sparing) SEED_SPARING[slug] = data.sparing;
  return ARTICLES.find((a) => a.slug === slug);
}

// ── jejak kunjungan sendiri ─────────────────────────────────────────────────
//
// Planet yang disinggahi pengunjung ini dikumpulkan selama sesi, lalu dikirim
// sekali saat ia pergi — bukan satu permintaan per klik. Sebuah kunjungan yang
// menjelajah tujuh planet tidak layak jadi tujuh baris di database, dan
// pengiriman per klik adalah yang paling terasa di sambungan lambat.
export function rekamKunjungan() {
  const lintasan = [];

  document.addEventListener('planet-focus', (e) => {
    const id = e.detail?.id;
    // Bolak-balik ke planet yang sama tidak menambah apa-apa pada ceritanya.
    if (id && lintasan[lintasan.length - 1] !== id && lintasan.length < 12) lintasan.push(id);
  });

  let terkirim = false;
  const kirimSekali = () => {
    if (terkirim || lintasan.length < 2) return;
    terkirim = true;
    const badan = JSON.stringify({ path: lintasan });
    // sendBeacon selamat dari halaman yang sedang ditutup; fetch biasa sering
    // dibatalkan browser tepat saat tab-nya hilang.
    if (navigator.sendBeacon) {
      navigator.sendBeacon(`${API}/presence`, new Blob([badan], { type: 'application/json' }));
    } else {
      catatJejak(lintasan);
    }
  };

  // `pagehide` lebih tepercaya daripada `beforeunload` di peramban seluler,
  // yang sering menutup tab tanpa pernah memicunya.
  addEventListener('pagehide', kirimSekali);
  addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') kirimSekali();
  });
}

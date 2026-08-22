// Presence live: siapa yang sedang membuka situs ini, sekarang.
//
// Jejak di `trails.js` adalah masa lalu — lintasan orang yang sudah pergi.
// Modul ini masa kini. Keduanya sengaja terpisah: yang satu bertahan berhari-
// hari dan boleh di-cache, yang satu berumur detik dan tidak boleh.
//
// ── Kenapa EventSource, bukan WebSocket ─────────────────────────────────────
//
// Yang dibutuhkan cuma satu arah. Server memberi tahu siapa yang datang,
// pindah, dan pergi; laporan balik ("saya sekarang di Karya") cukup lewat POST
// biasa yang sudah punya rate limit di server.
//
// Bonusnya nyata: EventSource menyambung ulang sendiri saat koneksi putus,
// lengkap dengan jeda yang membesar. Dengan WebSocket, semua itu harus ditulis
// tangan — dan biasanya baru ditulis setelah ada yang mengeluh.
import { API } from './remote.js';

const LAPOR_MS = 45_000;   // di bawah batas 90 detik milik server
const TUNDA_MS = 400;      // klik beruntun antar planet tidak perlu dilaporkan semua

const tamu = new Map();    // id → { id, planet, dari, warna, sejak }
let akuId = null;
let sumber = null;
let planetSaya = null;
let jedaLapor = null;
let jamLapor = null;

const pendengar = new Set();
const beritahu = (jenis, data) => { for (const fn of pendengar) fn(jenis, data); };

/** Berlangganan perubahan presence. Mengembalikan fungsi untuk berhenti. */
export function onLive(fn) {
  pendengar.add(fn);
  return () => pendengar.delete(fn);
}

export const tamuLain = () => [...tamu.values()];
export const jumlahTamu = () => tamu.size + (akuId ? 1 : 0);

function lapor(planet) {
  if (!akuId) return;
  // `keepalive` supaya laporan terakhir tetap terkirim walau tab sedang ditutup.
  fetch(`${API}/presence/here`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: akuId, planet }),
    keepalive: true
  }).catch(() => { /* presence tidak layak menimbulkan error di layar */ });
}

function jadwalkanLapor(planet) {
  planetSaya = planet;
  clearTimeout(jedaLapor);
  jedaLapor = setTimeout(() => lapor(planetSaya), TUNDA_MS);
}

export function mulaiLive() {
  // Server yang mati membuat EventSource mencoba lagi tanpa henti. Itu
  // perilaku yang benar untuk koneksi yang memang harus bertahan, dan
  // beban satu request tiap beberapa detik masih jauh lebih ringan daripada
  // polling.
  try {
    sumber = new EventSource(`${API}/presence/live`);
  } catch {
    return;   // browser lama, atau alamat API tidak valid
  }

  sumber.addEventListener('hello', (e) => {
    const d = JSON.parse(e.data);
    akuId = d.id;
    tamu.clear();
    for (const v of d.tamu) tamu.set(v.id, v);
    beritahu('siap', { aku: d, tamu: tamuLain() });
    // Planet yang sedang dibuka dilaporkan segera setelah punya id — kalau
    // tidak, orang yang sudah lama membuka satu planet tampil melayang di
    // tempat kosong sampai ia berpindah.
    if (planetSaya) lapor(planetSaya);
  });

  // Diri sendiri disaring di sini, bukan di server.
  //
  // Server menyiarkan `move` ke semua koneksi tanpa kecuali, dan itu memang
  // lebih sederhana — ia tidak perlu tahu siapa yang sedang menonton siapa.
  // Konsekuensinya, tab yang berpindah planet menerima kabar tentang dirinya
  // sendiri dan menggambar titik kedua di tempat kameranya berada. Keputusan
  // "siapa yang layak digambar" memang milik klien.
  const bukanAku = (v) => v.id !== akuId;

  sumber.addEventListener('join', (e) => {
    const v = JSON.parse(e.data);
    if (!bukanAku(v)) return;
    tamu.set(v.id, v);
    beritahu('join', v);
  });

  sumber.addEventListener('move', (e) => {
    const v = JSON.parse(e.data);
    if (!bukanAku(v)) return;
    tamu.set(v.id, { ...tamu.get(v.id), ...v });
    beritahu('move', v);
  });

  sumber.addEventListener('leave', (e) => {
    const { id } = JSON.parse(e.data);
    tamu.delete(id);
    beritahu('leave', { id });
  });

  // Kapasitas hub penuh. Koneksinya ditutup server; tidak perlu mencoba lagi
  // terus-menerus — situsnya tetap berfungsi tanpa presence.
  sumber.addEventListener('full', () => sumber?.close());

  // Scene yang memutuskan planet mana yang sedang dilihat, dan ia sudah
  // memancarkan kejadian itu untuk keperluan lain. Modul ini cuma menumpang.
  document.addEventListener('planet-focus', (e) => jadwalkanLapor(e.detail?.id ?? null));
  document.addEventListener('planet-free', () => jadwalkanLapor(null));

  // Denyut berkala. Tanpa ini, orang yang membaca satu artikel selama sepuluh
  // menit akan dianggap pergi oleh penyapu di server.
  jamLapor = setInterval(() => lapor(planetSaya), LAPOR_MS);

  addEventListener('pagehide', () => {
    clearInterval(jamLapor);
    sumber?.close();
  });
}

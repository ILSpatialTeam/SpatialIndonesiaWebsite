// Agenda & kehadiran — data contoh.
//
// Dua hal di sini yang menggerakkan tata surya, bukan sekadar mengisi teks:
//
// 1. AGENDA menentukan posisi planet Event. Jarak sudutnya ke Titik Temu
//    adalah sisa hari menuju pertemuan berikutnya — jadi orbitnya benar-benar
//    dipakai sebagai kalender, bukan hiasan yang berputar tanpa arti.
// 2. PRESENCE adalah lintasan penjelajah sebelumnya. Nanti diganti data asli
//    dari server; bentuknya sengaja dibuat sesederhana mungkin supaya
//    penggantian itu tidak menyentuh sisi 3D-nya sama sekali.

export const AGENDA = [
  { id: 'meetup-11', kind: 'MEETUP', title: 'XR Meetup #11', date: '2026-08-01', place: 'Jakarta', note: 'Demo malam & tukar perangkat.' },
  { id: 'meetup-12', kind: 'MEETUP', title: 'XR Meetup #12 — Malam Demo', date: '2026-08-30', place: 'Jakarta', note: 'Demo karya member, coba perangkat bareng.' },
  { id: 'workshop-webxr', kind: 'WORKSHOP', title: 'Workshop WebXR untuk Pemula', date: '2026-09-12', place: 'Daring', note: 'Kelas praktik tiga jam, kuota 40 orang.' },
  { id: 'open-build', kind: 'KOLABORASI', title: 'Open Build — Showcase Day', date: '2026-10-03', place: 'Bandung', note: 'Pameran proyek lintas disiplin.' },
  { id: 'kampus-ugm', kind: 'KAMPUS', title: 'Kelas Keliling — UGM', date: '2026-10-24', place: 'Yogyakarta', note: 'Pengenalan teknologi spatial untuk mahasiswa.' },
  { id: 'meetup-13', kind: 'MEETUP', title: 'XR Meetup #13', date: '2026-11-14', place: 'Surabaya', note: 'Meetup pertama di Jawa Timur.' }
];

// Lintasan penjelajah terakhir: berapa menit lalu, dan planet mana saja yang
// disinggahi. Yang terbaru menyala paling terang.
export const PRESENCE = [
  { ago: 3, path: ['inti', 'program', 'karya'] },
  { ago: 9, path: ['insight', 'tim', 'gabung'] },
  { ago: 17, path: ['inti', 'event', 'program'] },
  { ago: 26, path: ['karya', 'insight'] },
  { ago: 48, path: ['gabung', 'inti', 'tim'] },
  { ago: 71, path: ['program', 'event', 'insight'] },
  { ago: 96, path: ['tim', 'karya', 'inti'] },
  { ago: 133, path: ['event', 'gabung'] }
];

const DAY = 86400000;
const parse = d => {
  const [y, m, day] = d.split('-').map(Number);
  return Date.UTC(y, m - 1, day, 5, 0, 0);   // pukul 12 WIB
};

// Pertemuan berikutnya, yang sebelumnya, dan seberapa jauh perjalanan di antara
// keduanya sudah ditempuh (0 = baru lewat, 1 = hari-H).
export function agendaState(now) {
  const t = now === undefined ? Date.now() : now;
  const dated = AGENDA.map(a => Object.assign({}, a, { at: parse(a.date) })).sort((a, b) => a.at - b.at);
  const next = dated.find(a => a.at >= t) || null;
  const past = dated.filter(a => a.at < t);
  const prev = past.length ? past[past.length - 1] : null;
  if (!next) return { next: null, prev, progress: 1, days: 0, list: dated };
  const from = prev ? prev.at : next.at - 30 * DAY;
  const span = Math.max(next.at - from, DAY);
  return {
    next, prev, list: dated,
    progress: Math.min(1, Math.max(0, (t - from) / span)),
    days: Math.max(0, Math.ceil((next.at - t) / DAY))
  };
}

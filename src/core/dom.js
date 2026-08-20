// Tiga pertanyaan yang muncul di banyak tempat.
//
// `press` sengaja ada: tombol lama di dalam template masih memegang seluruh
// penanganan galat WebXR, jadi tombol baru cukup menekannya dari belakang
// layar alih-alih menyalin logikanya.
export const scene = () => document.querySelector('solar-system');
export const wide = () => innerWidth >= 780;
export const press = sel => { const b = document.querySelector(sel); if (b) b.click(); };

// Template dirender oleh kerangka kerja, jadi elemennya belum tentu ada saat
// modul dijalankan — dan urutan itu berbeda antara mode berkas terpisah dan
// bundel rilis. Alih-alih menebak urutan, tunggu sampai elemennya benar-benar
// muncul.
export function whenPresent(sel, fn, tries = 90) {
  const found = document.querySelector(sel);
  if (found) return fn(found);
  if (tries <= 0) return;
  requestAnimationFrame(() => whenPresent(sel, fn, tries - 1));
}

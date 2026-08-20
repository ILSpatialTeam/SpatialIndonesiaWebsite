// Satu-satunya pintu masuk ke three.js.
//
// Semua modul lain mengimpor dari sini, bukan langsung ke CDN. Dengan begitu
// mengganti versi, pindah ke berkas lokal, atau menukar build mentah/terkompresi
// cukup diubah di satu baris — bukan di sepuluh berkas (dependency inversion:
// modul bergantung pada abstraksi "three", bukan pada alamat unduhannya).
export * from 'https://unpkg.com/three@0.184.0/build/three.module.min.js';

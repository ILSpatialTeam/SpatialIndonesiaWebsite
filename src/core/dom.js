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

// `whenPresent` menjawab "elemennya sudah ada?"; ini menjawab pertanyaan kedua
// yang ternyata sama pentingnya: "React sudah selesai memasangnya?".
//
// Elemen template bisa sudah ada di DOM sementara React masih di tengah render
// pertamanya. Mengubah subtree-nya pada saat itu membuat commit berikutnya
// gagal dengan `insertBefore ... not a child of this node` — dan yang tumbang
// bukan satu panel, melainkan seluruh halaman: runtime Design Canvas menangkap
// galatnya dan menggantinya dengan teks galat.
//
// Kenapa ini gampang terlewat: gejalanya HANYA muncul di bundel rilis. Di mode
// berkas terpisah, jeda jaringan tiap modul sudah cukup mendorong respons API
// lewat dari render pertama React, jadi urutannya kebetulan selamat. Jangan
// menghapus penundaan ini karena "di localhost tidak kelihatan apa-apa" —
// justru di sanalah ia tidak kelihatan.
//
// Bingkainya lewat requestAnimationFrame, jadi di tab latar belakang tulisan
// ini tertunda sampai tab-nya dilihat. Itu memang yang diinginkan: satu-satunya
// cara melihat isi yang basi adalah dengan melihat tab-nya, dan begitu dilihat
// bingkainya jalan. `whenPresent` di atas sudah bersifat sama.
export function whenSettled(fn) {
  const jalan = () => requestAnimationFrame(fn);
  if (document.readyState === 'complete') jalan();
  else addEventListener('load', jalan, { once: true });
}

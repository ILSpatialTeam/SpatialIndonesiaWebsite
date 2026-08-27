// Organisme: menyamakan nama menu di template dengan data.
//
// Nama satu menu sebelumnya hidup di empat tempat sekaligus: `NAV` (yang diisi
// server lewat `data/remote.js`), pil melayang di dekat planet, daftar planet
// di panel menu, dan rel navigasi. Tiga yang terakhir markup statis di
// `index.html` — jadi mengganti nama menu di dashboard tidak mengubah apa pun
// yang terlihat di layar biasa, dan yang ikut berubah hanya label 3D di dalam
// headset. Berkas ini yang menutup jaraknya.
//
// ── Kenapa teksnya ditimpa, bukan markup-nya dibangun ulang ─────────────────
//
// Alasan yang sama dengan `panel-content.js`: pil dan tombolnya memakai gaya
// inline panjang milik desainer, dan menyalinnya ke JavaScript berarti dua
// sumber kebenaran untuk satu tampilan — yang satu pasti tertinggal begitu
// desainnya disentuh. Yang diganti di sini cuma simpul teksnya.
//
// ── Kenapa ada MutationObserver ─────────────────────────────────────────────
//
// Pil dan tombol itu milik React-nya Design Canvas. Saat ia merender ulang,
// nama yang kita tulis kembali ke yang tertulis di `index.html`. Pengawasnya
// dilepas selama menulis dan catatannya dibuang dengan `takeRecords()` sebelum
// disambung lagi — tanpa itu tulisan kita sendiri yang membangunkannya.
import { whenPresent, whenSettled } from '../../core/dom.js';
import { NAV } from '../../data/planets.js';

// NAV diisi ulang di tempat oleh `data/remote.js`, jadi namanya selalu dibaca
// saat dibutuhkan — bukan disalin ke variabel modul yang lalu jadi basi.
const namaMenu = (id) => NAV.find((n) => n.id === id)?.label || '';

// Pil planet: <span data-planet-icon> lalu satu <span> berisi namanya.
const isiPil = (akar) => akar.querySelector('span:not([data-planet-icon])');

// Baris daftar planet: nomor · nama · petunjuk. Yang tengah namanya.
const isiBaris = (akar) => (akar.children.length >= 2 ? akar.children[1] : null);

// Dua bentuk yang menampilkan nama yang sama. Ditulis sebagai daftar supaya
// menambah tempat ketiga nanti cukup satu baris di sini.
const BENTUK = [
  { nama: 'pil', sel: (id) => `[data-planet-label="${id}"]`, isi: isiPil },
  { nama: 'baris', sel: (id) => `[data-nav="${id}"]`, isi: isiBaris }
];

const PENGAMATAN = { childList: true, subtree: true, characterData: true };
const diawasi = new Map();

function tulisAman(kunci, akar, id, isi) {
  const pengawas = diawasi.get(kunci)?.pengawas;
  pengawas?.disconnect();
  try {
    const simpul = isi(akar);
    const label = namaMenu(id);
    // Menulis hanya kalau memang berbeda: kalau suatu saat React mengembalikan
    // nilainya, ping-pong-nya berhenti di sini, bukan berputar terus.
    if (simpul && label && simpul.textContent !== label) simpul.textContent = label;
  } finally {
    pengawas?.takeRecords();
    pengawas?.observe(akar, PENGAMATAN);
  }
}

function pasangPengawas(kunci, akar, id, isi) {
  const lama = diawasi.get(kunci);
  if (lama?.akar === akar) return;
  lama?.pengawas.disconnect();
  const pengawas = new MutationObserver(() => tulisAman(kunci, akar, id, isi));
  diawasi.set(kunci, { pengawas, akar });
  pengawas.observe(akar, PENGAMATAN);
}

function gambarSemua() {
  for (const { id } of NAV) {
    for (const bentuk of BENTUK) {
      const kunci = `${bentuk.nama}:${id}`;
      whenPresent(bentuk.sel(id), (akar) => {
        pasangPengawas(kunci, akar, id, bentuk.isi);
        tulisAman(kunci, akar, id, bentuk.isi);
      });
    }
  }
}

// Alasan `whenSettled` sama persis dengan `panel-content.js`: pil dan tombolnya
// milik React, dan menulis teksnya sebelum render pertamanya usai menjatuhkan
// seluruh halaman — hanya terlihat di bundel rilis.
whenSettled(gambarSemua);
// Data dari server datang belakangan; namanya ditulis ulang saat itu.
document.addEventListener('data-ready', () => whenSettled(gambarSemua));

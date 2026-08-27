// Organisme: mengisi panel menu dari data.
//
// Tujuh panel di `index.html` sekarang isinya datang dari server. Yang tidak
// berubah adalah *bentuknya* — dan itu disengaja.
//
// ── Kenapa mengkloning baris yang sudah ada, bukan membangun markup baru ────
//
// Tiap panel punya tata letak sendiri dengan gaya inline yang panjang: butir
// Inti berupa grid dua kolom, Program berupa kartu bergaris, Karya punya kotak
// gambar, Tim berupa kisi dua kolom. Menyalin semua gaya itu ke JavaScript
// berarti punya dua sumber kebenaran untuk satu tampilan, dan yang satu pasti
// tertinggal begitu desainnya disentuh.
//
// Jadi baris pertama yang sudah ada di template dipakai sebagai cetakan:
// dikloning, teksnya diganti, sisanya dibuang. Mengubah desain panel cukup di
// `index.html` seperti biasa — berkas ini ikut sendiri.
//
// ── Kenapa ada MutationObserver ─────────────────────────────────────────────
//
// Panel-panel itu milik React-nya Design Canvas. Saat ia merender ulang, isi
// yang kita suntikkan bisa terhapus. Pola yang sama sudah dipakai
// `event-card.js`: awasi wadahnya, gambar ulang kalau isinya hilang.
import { whenPresent, whenSettled } from '../../core/dom.js';
import { PANELS } from '../../data/panels.js';
import { ARTICLES, CATEGORIES } from '../../data/insight.js';

const teks = (n, v) => { if (n) n.textContent = v ?? ''; };

// Cetakan disimpan saat pertama kali panel ditemukan — sebelum ada yang
// mengosongkannya. Diambil belakangan, yang tersisa mungkin hasil hidrasi
// sebelumnya, dan cetakannya pelan-pelan menyimpang.
const cetakan = new Map();

function ambilCetakan(id, wadah) {
  if (!cetakan.has(id)) {
    const pertama = wadah.firstElementChild;
    if (!pertama) return null;
    cetakan.set(id, pertama.cloneNode(true));
  }
  return cetakan.get(id);
}

// Pengisi per panel. Masing-masing menerima satu baris hasil klon dan satu
// butir data, lalu menaruh teksnya di tempat yang benar untuk panel itu.
const PENGISI = {
  inti: (baris, it) => {
    teks(baris.querySelector('span'), it.k);
    teks(baris.querySelector('p'), it.d);
  },
  program: (baris, it) => {
    teks(baris.querySelector('div'), it.k);
    teks(baris.querySelector('h3'), it.t ?? it.k);
    teks(baris.querySelector('p'), it.d);
  },
  karya: (baris, it) => {
    const visual = baris.firstElementChild;
    if (visual && it.foto) {
      visual.textContent = '';
      visual.style.backgroundImage = `url(${it.foto})`;
      visual.style.backgroundSize = 'cover';
      visual.style.backgroundPosition = 'center';
    }
    const info = baris.lastElementChild;
    if (info) {
      const keping = info.querySelectorAll('span');
      const bagian = String(it.k ?? '').split('·').map((s) => s.trim()).filter(Boolean);
      keping.forEach((s, i) => {
        if (bagian[i]) { s.textContent = bagian[i]; s.hidden = false; }
        else s.hidden = true;
      });
    }
    teks(baris.querySelector('h3'), it.t ?? '');
    teks(baris.querySelector('p'), it.d);
  },
  tim: (baris, it) => {
    const foto = baris.firstElementChild;
    const info = baris.lastElementChild;
    if (foto && it.foto) {
      foto.textContent = '';
      foto.style.backgroundImage = `url(${it.foto})`;
      foto.style.backgroundSize = 'cover';
      foto.style.backgroundPosition = 'center top';
    }
    if (info) {
      const divs = info.children;
      teks(divs[0], it.t ?? it.k);
      teks(divs[1], it.d);
    }
  }
};

// Panel Insight tidak memakai butir menu: isinya tiga artikel terbaru, dan
// mengetiknya dua kali di dashboard adalah undangan supaya keduanya berbeda.
function isiInsight(wadah, cetak) {
  const terbaru = ARTICLES.filter((a) => !a.archived).slice(0, 3);
  if (!terbaru.length) return;
  wadah.replaceChildren();
  for (const a of terbaru) {
    const baris = cetak.cloneNode(true);
    const s = baris.querySelectorAll('span');
    teks(s[0], (CATEGORIES[a.cat] || {}).label || 'Insight');
    teks(s[1], a.title);
    teks(s[2], a.lead);
    // Artikel Medium membuka tab baru; yang internal tetap membuka pembaca 3D
    // lewat tautan jangkar yang sudah ada.
    if (a.external && a.href) {
      baris.setAttribute('href', a.href);
      baris.setAttribute('target', '_blank');
      baris.setAttribute('rel', 'noopener noreferrer');
    } else {
      baris.setAttribute('href', '#insight');
      baris.removeAttribute('target');
    }
    wadah.append(baris);
  }
}

function isiTautan(wadah, cetak, links) {
  if (!links?.length) return;
  wadah.replaceChildren();
  for (const l of links) {
    const a = cetak.cloneNode(true);
    a.textContent = l.label;
    a.setAttribute('href', l.url);
    if (/^https?:/.test(l.url)) {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
    }
    wadah.append(a);
  }
}

function gambar(id, panel) {
  const d = PANELS[id];
  if (!d || !panel) return;

  teks(panel.querySelector('[data-slot="eyebrow"]'), `Planet ${d.no} · ${d.tag}`);
  teks(panel.querySelector('[data-slot="title"]'), d.title);
  teks(panel.querySelector('[data-slot="lead"]'), d.lead);

  const wadahTautan = panel.querySelector('[data-slot="links"]');
  if (wadahTautan) {
    const cetak = ambilCetakan(`${id}:links`, wadahTautan);
    if (cetak) isiTautan(wadahTautan, cetak, d.links);
  }

  const wadah = panel.querySelector('[data-slot="items"]');
  if (!wadah) return;
  const cetak = ambilCetakan(id, wadah);
  if (!cetak) return;

  if (id === 'insight') return isiInsight(wadah, cetak);

  const pengisi = PENGISI[id];
  const butir = d.items ?? [];
  // Panel tanpa pengisi (atau tanpa butir) dibiarkan apa adanya. Mengosongkan
  // panel karena datanya belum sampai jauh lebih buruk daripada menampilkan
  // isi bawaan yang sedikit basi.
  if (!pengisi || !butir.length) return;

  wadah.replaceChildren();
  for (const it of butir) {
    const baris = cetak.cloneNode(true);
    pengisi(baris, it);
    wadah.append(baris);
  }
}

const ID = ['inti', 'program', 'karya', 'event', 'insight', 'tim', 'gabung'];
const diawasi = new Map();

// Pengawas dilepas selama menggambar, lalu dipasang lagi.
//
// Tanpa ini modulnya memakan dirinya sendiri: pengawas mengamati subtree,
// `gambar()` mengubah subtree, perubahan itu membangunkan pengawas, dan
// seterusnya sampai tab-nya membeku. `subtree: true` tetap dibutuhkan — yang
// dihapus React adalah isi wadah butir, bukan anak langsung panel — jadi
// jawabannya bukan mempersempit pengamatan, melainkan menjeda.
function gambarAman(id, panel) {
  const pengawas = diawasi.get(id);
  pengawas?.disconnect();
  try {
    gambar(id, panel);
  } finally {
    // takeRecords() membuang catatan perubahan yang kita buat sendiri, supaya
    // tidak langsung terkirim begitu pengamatan disambung.
    pengawas?.takeRecords();
    pengawas?.observe(panel, { childList: true, subtree: true });
  }
}

function pasangPengawas(id, panel) {
  const lama = diawasi.get(id);
  if (lama?.panel === panel) return;
  lama?.disconnect();
  const pengawas = new MutationObserver(() => {
    // Hanya digambar ulang kalau penanda slotnya masih ada. Kalau React
    // mengganti seluruh panel, panggilan whenPresent berikutnya yang menangani.
    if (panel.querySelector('[data-slot="title"]')) gambarAman(id, panel);
  });
  pengawas.panel = panel;
  pengawas.observe(panel, { childList: true, subtree: true });
  diawasi.set(id, pengawas);
}

function gambarSemua() {
  for (const id of ID) {
    whenPresent(`[data-panel="${id}"]`, (panel) => {
      pasangPengawas(id, panel);
      gambarAman(id, panel);
    });
  }
}

// Digambar setelah render pertama React selesai, bukan saat modul dievaluasi:
// panel-panel ini miliknya, dan menyentuhnya di tengah render menjatuhkan
// seluruh halaman. Lihat `whenSettled` di `core/dom.js` untuk kejadiannya.
whenSettled(gambarSemua);
// Data dari server datang belakangan; panel digambar ulang saat itu — lewat
// penjaga yang sama, karena respons bisa datang sebelum render pertama usai.
document.addEventListener('data-ready', () => whenSettled(gambarSemua));

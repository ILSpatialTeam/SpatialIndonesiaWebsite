// Organisme: membaca titipan orang lain di langit.
//
// Sebuah bintang komunitas membawa tiga hal — nama depan, kota, dan satu
// kalimat. Tanpa berkas ini ketiganya sudah sampai di browser tapi tidak pernah
// terbaca siapa pun: yang tergambar cuma titik cahaya.
//
// ── Kenapa hover DAN ketukan ────────────────────────────────────────────────
//
// Di layar sentuh tidak ada hover, dan bintang ini bukan tombol yang bisa
// diberi ukuran sentuh yang layak — ia sebesar beberapa piksel di kubah langit.
// Jadi scene mengirim dua kejadian: `sky-star-hover` untuk penunjuk, dan
// `sky-star-open` untuk ketukan. Yang kedua mengunci kartunya supaya jarinya
// bisa diangkat tanpa kartunya ikut hilang.
import { el } from '../atoms/el.js';

export const css = `/* -- kartu titipan di langit komunitas -- */
.hud-starcard {
  position: fixed; z-index: 36; display: none;
  width: min(268px, calc(100vw - 28px));
  padding: 13px 15px 14px;
  border: 1px solid rgba(255,233,196,.26); border-radius: 12px;
  background: rgba(12,10,18,.93);
  backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
  box-shadow: 0 18px 48px rgba(0,0,0,.55);
  pointer-events: none;
  animation: hudSig .22s cubic-bezier(.2,.7,.2,1) both;
}
.hud-starcard.on { display: block; }

/* Terkunci lewat ketukan: sekarang ia boleh menerima pointer, karena ada
   tombol tutup yang harus bisa ditekan. */
.hud-starcard.pin { pointer-events: auto; border-color: rgba(255,233,196,.5); }

.hud-starcard .kepala { display: flex; align-items: baseline; gap: 8px; }
.hud-starcard .nama { font-family: 'Poppins', sans-serif; font-size: 14.5px; font-weight: 600; color: #ffe9c4; }
.hud-starcard .kota { font-size: 11px; color: var(--hud-muted); }

.hud-starcard .pesan {
  margin: 9px 0 0; font-size: 12.5px; line-height: 1.55; color: #cfcadd;
  /* Catatan dibatasi 60 karakter di server, tapi satu kata panjang tanpa spasi
     tetap bisa melebarkan kartunya kalau tidak dipatahkan. */
  overflow-wrap: anywhere;
}

.hud-starcard .kaki {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  margin-top: 11px; padding-top: 9px; border-top: 1px solid rgba(243,242,248,.08);
  font-family: var(--hud-mono); font-size: 9px; letter-spacing: .18em;
  text-transform: uppercase; color: var(--hud-dim);
}

.hud-starcard .tutup {
  display: none; padding: 3px 9px; border-radius: 999px;
  border: 1px solid rgba(243,242,248,.2); background: transparent;
  color: var(--hud-muted); font-family: inherit; font-size: 9px;
  letter-spacing: .18em; text-transform: uppercase; cursor: pointer;
}
.hud-starcard.pin .tutup { display: block; }
.hud-starcard .tutup:hover { border-color: #ffe9c4; color: #ffe9c4; }
`;

const node = el('div', { class: 'hud-starcard', role: 'status', 'aria-live': 'polite' });
export { node };

let terkunci = false;

// 14px dari kursor, dan dibalik ke sisi lain kalau mepet tepi. Kartunya
// menutupi bintang yang sedang dibaca kalau digambar tepat di atasnya.
const JARAK = 14;

const TEPI = 8;
const jepit = (n, maks) => Math.max(TEPI, Math.min(n, maks));

function letakkan(x, y) {
  const lebar = node.offsetWidth || 268;
  const tinggi = node.offsetHeight || 96;
  // Sisi seberang kursor dipakai kalau sisi biasanya tidak muat. Pembalikan itu
  // sendiri tidak menjamin muat — kartu bisa lebih tinggi daripada ruang di
  // atas kursor — jadi hasilnya tetap dijepit ke dalam viewport. Tanpa itu,
  // bintang di dekat tepi bawah membuat separuh pesannya terpotong.
  const kiri = x + JARAK + lebar > innerWidth ? x - JARAK - lebar : x + JARAK;
  const atas = y + JARAK + tinggi > innerHeight ? y - JARAK - tinggi : y + JARAK;
  node.style.left = `${jepit(kiri, innerWidth - lebar - TEPI)}px`;
  node.style.top = `${jepit(atas, innerHeight - tinggi - TEPI)}px`;
}

function gambar(b) {
  node.replaceChildren(
    el('div', { class: 'kepala' }, [
      el('span', { class: 'nama', text: b.name }),
      b.city ? el('span', { class: 'kota', text: b.city }) : null
    ]),
    b.note ? el('p', { class: 'pesan', text: b.note }) : null,
    el('div', { class: 'kaki' }, [
      el('span', { text: `ra ${Number(b.ra).toFixed(2)}j · dec ${Number(b.dec).toFixed(1)}°` }),
      el('button', { class: 'tutup', type: 'button', text: 'Close', onclick: lepas })
    ])
  );
}

function tampilkan(b, x, y, pin) {
  gambar(b);
  terkunci = pin;
  node.classList.toggle('pin', pin);
  node.classList.add('on');
  // Diletakkan setelah dipasang: sebelum itu `offsetWidth` masih nol dan
  // pembalikan di tepi layar tidak pernah kena.
  letakkan(x, y);
}

function lepas() {
  terkunci = false;
  node.classList.remove('on', 'pin');
}

// Hover tidak boleh membatalkan kartu yang sudah dikunci — di desktop, gerakan
// kecil menuju tombol tutup akan langsung menutupnya sendiri.
document.addEventListener('sky-star-hover', (e) => {
  if (terkunci) return;
  const { bintang, x, y } = e.detail ?? {};
  if (bintang) tampilkan(bintang, x, y, false); else lepas();
});

document.addEventListener('sky-star-open', (e) => {
  const { bintang, x, y } = e.detail ?? {};
  if (bintang) tampilkan(bintang, x, y, true);
});

// Mengetuk langit kosong melepas kunciannya, sama seperti menutup panel lain.
// Fase capture supaya keputusannya diambil sebelum scene memproses ketukannya.
addEventListener('pointerdown', (e) => {
  if (terkunci && !node.contains(e.target)) lepas();
}, true);

addEventListener('keydown', (e) => { if (e.key === 'Escape' && terkunci) lepas(); });

// Mode rasi dimatikan berarti langitnya hilang; kartu yang bertahan setelah itu
// merujuk ke sesuatu yang sudah tidak ada di layar.
document.addEventListener('sky-lore', (e) => { if (!e.detail?.on) lepas(); });

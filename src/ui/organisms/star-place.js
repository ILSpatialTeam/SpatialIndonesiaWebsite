// Organisme: menaruh bintang di langit komunitas.
//
// ── Kenapa tombolnya ada di gugus instrumen ─────────────────────────────────
//
// Versi pertama memasang pil bertulisan di tengah bawah layar. Ia bekerja, tapi
// duduk persis di atas tata suryanya — dan dalam keadaan "kamu sudah punya
// bintang" ia berubah jadi papan status permanen yang tidak menawarkan apa pun.
// Sebuah keterangan yang selalu terlihat adalah harga yang mahal untuk sesuatu
// yang dibaca sekali.
//
// Sekarang ia satu tombol bundar di gugus kanan atas, tepat di sebelah tombol
// rasi bintang. Aksinya memang milik mode langit itu, jadi tempatnya di samping
// sakelar yang menyalakannya. Keterangannya muncul saat disentuh, seperti
// seluruh instrumen lain.
//
// Tombolnya selalu ada, tidak muncul-hilang mengikuti mode rasi: baris
// instrumen yang isinya berubah-ubah membuat tombol tetangganya bergeser tiap
// kali mode dinyalakan. Kalau langitnya belum menyala, tombol ini yang
// menyalakannya — satu langkah persiapan yang tidak perlu ditanggung pengguna.
//
// Alurnya tetap tiga langkah:
//   1. Ditekan → kursor jadi bidikan, satu klik di langit mengunci koordinat
//   2. Form kecil: nama depan, kota, satu kalimat
//   3. Kirim, bintangnya menyala
//
// Pengunjung yang sudah punya bintang mendapat tombol yang berbeda tugasnya:
// memutar pandangan ke bintangnya sendiri, bukan menawarkan bintang kedua.
import { el } from '../atoms/el.js';
import { instrument } from '../molecules/instrument.js';
import { scene } from '../../core/dom.js';
import { API } from '../../data/remote.js';
import { signal } from './signals.js';

export const css = `/* -- taruh bintang di langit komunitas -- */

/* Sudah punya bintang: cincinnya hangat, sewarna bintang komunitas di langit.
   Bukan ungu seperti .on, supaya "milikmu menyala di sana" tidak tertukar
   dengan "mode ini sedang aktif". */
.hud-btn[data-hud-btn="star"].punya { color: #ffe9c4; }
.hud-btn[data-hud-btn="star"].punya .ring { border-color: rgba(255,233,196,.6); box-shadow: 0 0 22px rgba(255,233,196,.22); }
.hud-btn[data-hud-btn="star"].on { color: #ffe9c4; background: radial-gradient(circle at 50% 35%, rgba(255,233,196,.28), rgba(18,17,22,.5) 72%); }
.hud-btn[data-hud-btn="star"].on .ring { border-color: rgba(255,233,196,.85); box-shadow: 0 0 26px rgba(255,233,196,.3); }
.hud-btn[data-hud-btn="star"].on .arc { border-color: rgba(255,233,196,.45); }

/* Wadah form menggantung di bawah gugus instrumen. Letaknya diukur saat
   digambar (lihat tempelDiBawahGugus di bawah), bukan dipatok angka: tinggi
   gugus itu berubah antara layar lebar dan sempit, dan bertambah setiap kali
   ada alat baru. Nilai di sini cuma cadangan kalau gugusnya belum ada.

   fixed, bukan absolute: koordinat yang dipasang berasal dari
   getBoundingClientRect, dan itu koordinat viewport. */
.hud-star { position: fixed; top: 126px; right: 30px; z-index: 34; display: none; pointer-events: auto; }
.hud-star.on { display: block; animation: hudSig .3s ease both; }

/* Petunjuk saat membidik: elemen tersendiri di kaki layar — ruang yang justru
   dikosongkan oleh perpindahan tombolnya. Di atas ia akan bertabrakan dengan
   tumpukan transmisi, dan di dekat kursor ia menutupi tempat yang sedang
   dipilih orang.

   Ia TIDAK boleh jadi anak .hud-star. Wadah itu punya animasi yang menganimasi
   transform, dan elemen ber-transform adalah containing block bagi keturunan
   position: fixed — hint-nya akan ikut menempel di panel kanan atas alih-alih
   di tengah layar. Sudah kejadian, dan gejalanya tampak seperti salah hitung
   posisi, bukan seperti aturan CSS.

   Teksnya boleh turun ke baris berikutnya. Dengan huruf kapital dan jarak huruf
   selebar ini, satu baris memakan 481px — terpotong di kedua sisi pada layar
   ponsel mana pun. */
.hud-aim {
  position: fixed; left: 50%; bottom: 84px; transform: translateX(-50%);
  z-index: 34; display: none;
  max-width: min(540px, calc(100vw - 28px));
  padding: 8px 18px; border-radius: 16px; border: 1px solid rgba(255,233,196,.35);
  background: rgba(12,10,18,.9); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
  color: #ffe9c4; text-align: center;
  font-family: var(--hud-mono); font-size: 10.5px; line-height: 1.7;
  letter-spacing: .16em; text-transform: uppercase;
  pointer-events: none;
  /* Keyframe sendiri, bukan hudSig. Animasi ber-fill: both menimpa transform
     elemennya, dan hudSig berakhir di transform: none — translateX(-50%) yang
     memusatkan pil ini ikut terhapus, jadi ia melenceng setengah lebarnya ke
     kanan. Jebakan yang sama pernah menggigit di meteor-hud.js. */
  animation: hudAimIn .3s cubic-bezier(.2,.7,.2,1) both;
}
.hud-aim.on { display: block; }

@keyframes hudAimIn {
  from { opacity: 0; transform: translateX(-50%) translateY(10px); }
  to { opacity: 1; transform: translateX(-50%); }
}

/* Layar sentuh tidak punya tombol Escape. Membatalkan di sana dilakukan lewat
   tombol instrumen yang sama, yang memang sudah berubah jadi "Batal membidik". */
@media (pointer: coarse) { .hud-aim .esc { display: none; } }

.hud-star form {
  display: flex; flex-direction: column; gap: 10px; width: min(300px, calc(100vw - 24px)); padding: 18px;
  border: 1px solid rgba(255,233,196,.3); border-radius: 12px;
  background: rgba(12,10,18,.94); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
  box-shadow: 0 24px 60px rgba(0,0,0,.6);
}
.hud-star form h4 { margin: 0; font-family: 'Poppins', sans-serif; font-size: 15px; font-weight: 600; color: #f3f2f8; }
.hud-star form p { margin: 0; font-size: 11.5px; line-height: 1.5; color: #8f8aa3; }
.hud-star form input {
  padding: 9px 11px; border: 1px solid rgba(243,242,248,.16); border-radius: 6px;
  background: rgba(243,242,248,.04); color: #f3f2f8;
  font-family: 'Instrument Sans', sans-serif; font-size: 13px;
}
.hud-star form input:focus { border-color: #ffe9c4; outline: none; }
.hud-star form .aksi { display: flex; gap: 8px; justify-content: flex-end; }
.hud-star form button {
  padding: 8px 15px; border-radius: 999px; border: 1px solid rgba(243,242,248,.18);
  background: transparent; color: #f3f2f8; font-family: inherit; font-size: 12.5px; cursor: pointer;
}
.hud-star form button.utama { border-color: transparent; background: #ffe9c4; color: #1a1408; font-weight: 600; }
.hud-star form button:disabled { opacity: .45; cursor: not-allowed; }

@media (max-width: 779px) {
  .hud-star { top: calc(112px + env(safe-area-inset-top)); right: 12px; }
  .hud-aim {
    bottom: calc(74px + env(safe-area-inset-bottom));
    padding: 7px 14px; font-size: 9px; letter-spacing: .1em; line-height: 1.65;
  }
}
`;

const node = el('div', { class: 'hud-star' });
// Simpul terpisah, bukan anak `node` — alasannya ada di komentar CSS di atas.
const hint = el('div', { class: 'hud-aim' }, [
  document.createTextNode('Klik di langit untuk menaruh bintangmu'),
  el('span', { class: 'esc', text: ' · Esc untuk batal' })
]);
const button = instrument('star', 'star', 'Taruh bintangmu', () => tekan());
export { node, hint, button };

let mode = 'diam';        // diam | bidik | isi
let koordinat = null;
let punyaBintang = false;
let rasiMenyala = false;

// Kursor bidik dipasang di elemen kanvas, bukan di body — kanvas 3D memakai
// `touch-action: none` dan punya kursornya sendiri.
const kanvas = () => document.querySelector('solar-system canvas');

function pasangKursor() {
  const c = kanvas();
  if (c) c.style.cursor = mode === 'bidik' ? 'crosshair' : '';
}

// Keterangan tombol hidup di tiga tempat sekaligus — tooltip bawaan browser,
// nama untuk pembaca layar, dan label kecil di bawah ikon. Ketiganya diubah
// bersama; melewatkan salah satunya membuat tombolnya berbohong kepada
// sebagian pengguna saja.
function namaiTombol(teks) {
  button.title = teks;
  button.setAttribute('aria-label', teks);
  const cap = button.querySelector('.cap');
  if (cap) cap.textContent = teks.toUpperCase();
}

function segarkanTombol() {
  button.classList.toggle('on', mode !== 'diam');
  button.classList.toggle('punya', punyaBintang && mode === 'diam');
  if (mode !== 'diam') namaiTombol('Batal membidik');
  else namaiTombol(punyaBintang ? 'Cari bintangmu' : 'Taruh bintangmu');
}

function tekan() {
  if (mode !== 'diam') return batal();
  if (punyaBintang) return cariMilikku();

  // Langit yang belum menyala dinyalakan dulu: menaruh bintang di langit yang
  // tidak sedang ditampilkan adalah tindakan buta.
  if (!rasiMenyala) scene()?.setConstellations(true);
  mode = 'bidik';
  gambar();
}

// Form-nya menggantung tepat di bawah gugus instrumen, sejajar tepi kanannya.
// Diukur, bukan dihitung dari angka di CSS: tinggi gugus berubah antara layar
// lebar dan sempit, dan bertambah tiap kali ada alat baru. Angka mati di CSS
// sempat membuat form-nya menindih baris alat sebanyak 19 piksel.
const SELA = 12;
function tempelDiBawahGugus() {
  const gugus = document.querySelector('.hud-cluster');
  const induk = gugus?.offsetParent;
  if (!gugus || !induk || !gugus.offsetHeight) return;   // belum ada, atau tersembunyi

  // `offsetTop`/`offsetHeight`, bukan `getBoundingClientRect`. Yang kedua ikut
  // menghitung transform, dan gugus itu punya animasi masuk yang menggeser dan
  // menyusutkannya. Form yang dibuka sebelum animasinya selesai — atau saat tab
  // di latar belakang, yang membekukan animasi di tengah jalan — akan menempel
  // pada posisi sementara, bukan posisi sebenarnya.
  //
  // `offsetParent` di sini adalah lapisan HUD, yang menutupi seluruh viewport,
  // jadi koordinatnya sama dengan koordinat layar yang dipakai `position: fixed`.
  node.style.top = `${gugus.offsetTop + gugus.offsetHeight + SELA}px`;
  node.style.right = `${induk.clientWidth - (gugus.offsetLeft + gugus.offsetWidth)}px`;
}

// Rencana penerbangan berpindah bentuk: panel tegak di sisi kiri pada layar
// lebar, strip mendatar di kaki layar pada mode ponsel. Bentuk kedua berdiri
// persis di tempat hint ini.
//
// Yang diperiksa karena itu bukan "layarnya sempit atau tidak", melainkan
// apakah kedua kotaknya benar-benar bertabrakan. Aturan berbasis lebar layar
// akan tetap salah begitu tata letaknya berubah lagi — dan pernah hampir
// salah ke arah sebaliknya: mengangkat hint setinggi panel tegak melemparkannya
// ke puncak layar.
//
// Dipanggil SETELAH hint terpasang, karena kotaknya baru ada setelah itu.
function angkatDiAtasStrip() {
  hint.style.bottom = '';                 // kembali ke nilai CSS sebelum diukur
  const strip = document.querySelector('[data-ui="flightplan"]');
  if (!strip) return;

  const s = strip.getBoundingClientRect();
  // Strip yang disembunyikan (html.fp-hidden) masih menempati ruang; ia tidak
  // boleh ikut mendorong apa pun.
  if (!s.height || Number(getComputedStyle(strip).opacity) <= 0.05) return;

  const h = hint.getBoundingClientRect();
  const bertabrakan = h.left < s.right && h.right > s.left && h.top < s.bottom && h.bottom > s.top;
  if (!bertabrakan) return;

  hint.style.bottom = `${Math.round(innerHeight - s.top) + 12}px`;
}

function gambar() {
  pasangKursor();
  segarkanTombol();
  node.replaceChildren();
  hint.classList.toggle('on', mode === 'bidik');
  if (mode === 'bidik') angkatDiAtasStrip();
  node.classList.toggle('on', mode === 'isi');
  if (mode !== 'isi') return;
  tempelDiBawahGugus();

  const form = el('form');
  const nama = el('input', { name: 'name', placeholder: 'Nama depan', maxlength: '24', required: '' });
  const kota = el('input', { name: 'city', placeholder: 'Kota (opsional)', maxlength: '40' });
  const catatan = el('input', { name: 'note', placeholder: 'Satu kalimat (opsional)', maxlength: '60' });
  const kirim = el('button', { class: 'utama', type: 'submit', text: 'Nyalakan' });

  form.append(
    el('h4', { text: 'Bintangmu' }),
    el('p', { text: `Tersimpan di ra ${koordinat.ra.toFixed(2)}j · dec ${koordinat.dec.toFixed(1)}°. Satu orang satu bintang, dan ia tetap di sana setelah kamu pergi.` }),
    nama, kota, catatan,
    el('div', { class: 'aksi' }, [
      el('button', { type: 'button', text: 'Batal', onclick: batal }),
      kirim
    ])
  );

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    kirim.disabled = true;
    kirim.textContent = 'Mengirim…';
    try {
      const res = await fetch(`${API}/sky/stars`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ra: koordinat.ra, dec: koordinat.dec,
          name: nama.value.trim(), city: kota.value.trim(), note: catatan.value.trim()
        })
      });
      const hasil = await res.json();
      if (!res.ok) throw new Error(hasil?.error?.message || 'Gagal menaruh bintang.');

      const s = scene();
      s?.addSkyStar(hasil.bintang, true);
      s?.markMyStar(hasil.bintang);
      punyaBintang = true;
      signal(hasil.moderated
        ? 'Bintangmu menunggu ditinjau sebelum menyala untuk orang lain.'
        : 'Bintangmu menyala di langit Nusantara.');
      batal();
    } catch (err) {
      signal(err.message);
      kirim.disabled = false;
      kirim.textContent = 'Nyalakan';
    }
  });

  node.appendChild(form);
  requestAnimationFrame(() => nama.focus());
}

function batal() {
  mode = 'diam';
  koordinat = null;
  gambar();
}

// Sudah punya bintang: tombolnya memutar pandangan ke sana, bukan menawarkan
// bintang kedua. Server memang menolak yang kedua (409), tapi menawarkan form
// yang pasti gagal adalah janji palsu.
function cariMilikku() {
  if (!rasiMenyala) scene()?.setConstellations(true);
  const hasil = scene()?.findMyStar();
  if (!hasil?.ok) return signal('Bintangmu belum bisa ditemukan — coba lagi sebentar.');
  // Arahnya sudah benar; yang tidak bisa dipenuhi cuma kemiringan pandangan.
  // Mengatakannya lebih berguna daripada membiarkan orang mencari-cari.
  signal(hasil.mentok
    ? 'Bintangmu tinggi di atas, di luar jangkauan pandangan — arahnya sudah tepat.'
    : 'Bintangmu ada di depan sana.');
}

// Klik di kanvas saat membidik. Ditangkap di fase capture supaya tidak ikut
// memicu perjalanan kamera ke planet yang kebetulan ada di balik kursor.
function tangkapKlik(e) {
  if (mode !== 'bidik') return;

  // Pendengarnya menempel di window pada fase capture, jadi ia melihat SETIAP
  // pointerdown — termasuk yang jatuh di tombol HUD lain. Tanpa saringan ini,
  // klik di tombol sembarang akan diukur terhadap kotak tombol itu, dan
  // koordinat langit yang keluar sepenuhnya ngawur.
  const c = kanvas();
  if (!c || e.target !== c) return;

  e.preventDefault();
  e.stopPropagation();

  const s = scene();
  const rect = c.getBoundingClientRect();
  const ndc = {
    x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
    y: -((e.clientY - rect.top) / rect.height) * 2 + 1
  };
  koordinat = s?.skyCoordAt(ndc);
  if (!koordinat) return batal();

  mode = 'isi';
  gambar();
}

addEventListener('pointerdown', tangkapKlik, true);
addEventListener('keydown', (e) => { if (e.key === 'Escape' && mode !== 'diam') batal(); });

// Keadaan nyala/mati mode rasi datang lewat `sky-lore`, yang dipancarkan tepat
// saat tombolnya ditekan.
//
// Sempat dipakai `sky-aim` — dan itu keliru: kejadian itu hanya terbit saat
// posisi langit dihitung ulang, yaitu sekali di awal lalu tiap 60 detik. Nyala
// dan matinya mode memang terbawa di dalamnya, tapi terlambat sampai satu menit.
document.addEventListener('sky-lore', (e) => {
  const nyala = Boolean(e.detail?.on);
  if (nyala === rasiMenyala) return;
  rasiMenyala = nyala;
  // Langitnya dimatikan di tengah jalan: bidikan dan form yang tertinggal
  // merujuk ke sesuatu yang sudah tidak terlihat.
  if (!nyala && mode !== 'diam') batal();
});

// Apakah pengunjung ini sudah punya bintang?
//
// Ditanyakan saat modul dimuat, bukan menunggu `scene-ready`. Kejadian itu
// terbit sekali saja di awal, dan bergantung padanya berarti bergantung pada
// urutan impor — kalau suatu hari modul ini dimuat sedetik lebih lambat,
// jawabannya tidak pernah datang dan tombolnya diam-diam salah.
//
// `markMyStar` menunggu scene-nya ada; kalau belum, dicoba lagi sebentar.
(async () => {
  let punya = null;
  try {
    const res = await fetch(`${API}/sky/mine`);
    punya = res.ok ? await res.json() : null;
  } catch { /* tanpa jawaban, tombolnya tetap menawarkan menaruh bintang */ }
  if (!punya) return;

  punyaBintang = true;
  segarkanTombol();

  const tandai = (sisa = 20) => {
    const s = scene();
    if (s?.markMyStar) return s.markMyStar(punya);
    if (sisa > 0) setTimeout(() => tandai(sisa - 1), 150);
  };
  tandai();
})();

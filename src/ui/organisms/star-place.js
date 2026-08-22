// Organisme: menaruh bintang di langit komunitas.
//
// Alurnya tiga langkah, dan urutannya penting: tombol hanya muncul saat mode
// rasi bintang menyala, karena hanya saat itulah langitnya terlihat. Menaruh
// bintang di langit yang tidak sedang ditampilkan adalah tindakan buta.
//
//   1. Mode rasi menyala → tombol "Taruh bintangmu" muncul di kaki layar
//   2. Ditekan → kursor jadi bidikan, satu klik di langit mengunci koordinat
//   3. Form kecil: nama depan, kota, satu kalimat. Kirim, bintangnya menyala.
//
// Pengunjung yang sudah punya bintang tidak melihat tombolnya lagi — yang
// muncul justru tombol untuk menemukan kembali bintangnya sendiri.
import { el } from '../atoms/el.js';
import { scene } from '../../core/dom.js';
import { API } from '../../data/remote.js';
import { signal } from './signals.js';

export const css = `/* -- taruh bintang di langit komunitas -- */
.hud-star { position: absolute; left: 50%; bottom: 92px; z-index: 34; transform: translateX(-50%); display: none; pointer-events: auto; }
.hud-star.on { display: block; animation: hudSig .3s ease both; }

.hud-star .ajak {
  display: flex; align-items: center; gap: 9px; padding: 9px 16px;
  border: 1px solid rgba(158,148,249,.4); border-radius: 999px;
  background: rgba(12,10,18,.86); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  color: #f3f2f8; font-family: 'Instrument Sans', sans-serif; font-size: 12.5px; cursor: pointer;
}
.hud-star .ajak:hover { border-color: #9E94F9; background: rgba(158,148,249,.14); }
.hud-star .ajak i { width: 6px; height: 6px; border-radius: 50%; background: #ffe9c4; box-shadow: 0 0 10px #ffe9c4; font-style: normal; }

/* Petunjuk saat sedang membidik. Sengaja di tengah atas, jauh dari kursor —
   kalau di dekat kursor, ia menutupi tempat yang sedang dipilih orang. */
.hud-star .bidik {
  position: fixed; left: 50%; top: 84px; transform: translateX(-50%);
  padding: 8px 18px; border-radius: 999px; border: 1px solid rgba(255,233,196,.35);
  background: rgba(12,10,18,.9); color: #ffe9c4;
  font-family: 'JetBrains Mono', monospace; font-size: 10.5px; letter-spacing: .18em; text-transform: uppercase;
  white-space: nowrap; pointer-events: none;
}

.hud-star form {
  display: flex; flex-direction: column; gap: 10px; width: min(320px, 88vw); padding: 18px;
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
`;

const node = el('div', { class: 'hud-star' });
export { node };

let mode = 'diam';        // diam | bidik | isi
let koordinat = null;
let punyaBintang = false;
let rasiMenyala = false;

// Kursor bidik dipasang di elemen kanvas, bukan di body — kanvas 3D memakai
// `touch-action: none` dan punya kursornya sendiri.
const kanvas = () => document.querySelector('solar-system canvas');

// Kursor bidikan disetel saat mode berubah, bukan lewat timer. Kanvas 3D
// mengelola kursornya sendiri, jadi yang disentuh cuma saat benar-benar perlu.
function pasangKursor() {
  const c = kanvas();
  if (c) c.style.cursor = mode === 'bidik' ? 'crosshair' : '';
}

function gambar() {
  pasangKursor();
  node.replaceChildren();
  node.classList.toggle('on', rasiMenyala && mode !== 'diam' ? true : rasiMenyala);
  if (!rasiMenyala) return;

  if (mode === 'diam') {
    node.appendChild(el('button', {
      class: 'ajak',
      onclick: punyaBintang ? cariMilikku : () => { mode = 'bidik'; gambar(); },
      title: punyaBintang ? 'Putar pandangan ke bintangmu' : 'Taruh satu bintang di langit ini'
    }, [
      el('i'),
      document.createTextNode(punyaBintang ? 'Bintangmu ada di langit ini' : 'Taruh bintangmu')
    ]));
    return;
  }

  if (mode === 'bidik') {
    node.appendChild(el('div', { class: 'bidik', text: 'Klik di langit untuk menaruh bintangmu · Esc untuk batal' }));
    return;
  }

  // mode === 'isi'
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

// Sudah punya bintang: tombolnya memutar pandangan ke sana, bukan menawarkan
// bintang kedua. Server memang menolak yang kedua (409), tapi menawarkan form
// yang pasti gagal adalah janji palsu.
function cariMilikku() {
  const hasil = scene()?.findMyStar();
  if (!hasil?.ok) return signal('Bintangmu belum bisa ditemukan — coba lagi sebentar.');
  // Arahnya sudah benar; yang tidak bisa dipenuhi cuma kemiringan pandangan.
  // Mengatakannya lebih berguna daripada membiarkan orang mencari-cari.
  signal(hasil.mentok
    ? 'Bintangmu tinggi di atas, di luar jangkauan pandangan — arahnya sudah tepat.'
    : 'Bintangmu ada di depan sana.');
}

function batal() {
  mode = 'diam';
  koordinat = null;
  gambar();
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
  if (!nyala) batal(); else gambar();
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
  } catch { /* tanpa jawaban, tombolnya tetap tampil seperti biasa */ }
  if (!punya) return;

  punyaBintang = true;
  gambar();

  const tandai = (sisa = 20) => {
    const s = scene();
    if (s?.markMyStar) return s.markMyStar(punya);
    if (sisa > 0) setTimeout(() => tandai(sisa - 1), 150);
  };
  tandai();
})();

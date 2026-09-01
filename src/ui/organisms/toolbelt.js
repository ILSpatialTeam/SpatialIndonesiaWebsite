// Organisme: laci alat pandang (khusus layar sempit).
//
// Di layar lebar sembilan alat pandang berdiri sebagai sembilan lingkaran di
// kanan atas, dan itu memang tempatnya: ada ruang, ada keterangan yang muncul
// saat disorot, dan mengarahkan tetikus ke satu lingkaran kecil itu murah.
//
// Di ponsel tiga hal itu semuanya hilang sekaligus. Barisnya memakan 326px dari
// 390px lebar layar, keterangannya disembunyikan (`.cap` display:none di
// breakpoint yang sama), dan tiap sasaran sentuhnya tinggal 30px — di bawah
// ambang yang bisa ditekan dengan yakin. Yang tersisa buat pengunjung baru:
// sembilan lingkaran seragam tanpa nama, membentang selebar layar, sebelum ia
// sempat melihat tata suryanya sendiri.
//
// Jadi di bawah 780px kesembilannya melipat ke balik satu tombol, dan isinya
// muncul sebagai daftar bernama saat diminta. Yang ditukar: satu ketukan
// tambahan untuk alat yang memang bukan tujuan utama kunjungan pertama.
//
// Laci ini tidak membuat tombol apa pun dan tidak tahu apa tugas masing-masing.
// Ia menerima tombol yang sudah jadi, membaca nama dan keadaannya, lalu
// meneruskan ketukan ke tombol aslinya lewat `.click()`. Konsekuensinya:
// menambah alat baru di `app/hud.js` cukup menambahnya ke larik `tools` —
// berkas ini tidak ikut berubah, dan tidak ada nama yang ditulis dua kali.
import { el } from '../atoms/el.js';
import { icon } from '../atoms/icon.js';

export const css = `/* Tombol laci hanya hidup di layar sempit. Ia ikut duduk di baris alat, jadi
   pertukarannya murni CSS — tidak ada cabang JavaScript yang perlu tahu lebar
   layar, dan 780px tetap satu-satunya tempat keputusan itu diambil. */
.hud-btn[data-hud-btn="belt"] { display: none; }

.hud-belt {
  position: absolute; top: 92px; right: 12px; width: min(258px, calc(100vw - 24px));
  padding: 7px; border-radius: 15px; background: rgba(12,10,16,.93);
  backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
  box-shadow: 0 0 0 1px rgba(158,148,249,.16), 0 24px 64px rgba(0,0,0,.6);
  display: none; flex-direction: column; gap: 2px;
  /* Tertutup berarti benar-benar tidak ada. Ia tetap "display:flex" di ponsel
     supaya transisinya bisa berjalan, dan elemen ber-opacity 0 masih menangkap
     pointer — tanpa dua baris ini, seperempat layar di kanan atas berhenti
     merespons sentuhan pada kanvas tanpa ada apa pun yang terlihat di sana. */
  pointer-events: none; visibility: hidden;
  /* Layar pendek — ponsel dimiringkan — tidak boleh memotong baris terakhir.
     "touch-action" disebut sendiri karena kanvas 3D memakai "none": tanpa ini
     laci yang perlu digulir ikut membeku bersama kanvasnya. */
  max-height: calc(100vh - 104px - env(safe-area-inset-top)); overflow-y: auto;
  touch-action: pan-y; overscroll-behavior: contain; scrollbar-width: none;
  opacity: 0; transform: scale(.94) translateY(-6px); transform-origin: calc(100% - 22px) -14px;
  transition: opacity .22s, transform .3s cubic-bezier(.2,.7,.2,1), visibility .22s;
}

.hud-belt.open { opacity: 1; transform: none; pointer-events: auto; visibility: visible; }

.hud-belt::-webkit-scrollbar { display: none; }

/* 46px, bukan 30px seperti lingkarannya: begitu alatnya punya baris sendiri,
   tidak ada lagi alasan sasaran sentuhnya sesempit itu. */
.hud-belt .row {
  display: flex; align-items: center; gap: 12px; width: 100%; min-height: 46px;
  padding: 0 12px; border: 0; border-radius: 10px; background: transparent;
  color: #b9b4cc; font-family: inherit; font-size: 13.5px; text-align: left; cursor: pointer;
  transition: background .18s, color .18s;
}

.hud-belt .row:active { background: rgba(158,148,249,.14); }

.hud-belt .row svg { flex: 0 0 auto; width: 19px; height: 19px; }

.hud-belt .row .nm { flex: 1 1 auto; }

/* Penanda menyala ada di ujung kanan tiap baris, bukan cuma warna ikonnya:
   di daftar bernama, keadaan yang bisa dibaca lebih berguna daripada nuansa. */
.hud-belt .row .st {
  flex: 0 0 auto; font-family: var(--hud-mono); font-size: 8.5px; letter-spacing: .18em;
  color: var(--hud-iris); opacity: 0;
}

.hud-belt .row.on { color: var(--hud-paper); }

.hud-belt .row.on svg { color: var(--hud-iris); }

.hud-belt .row.on .st { opacity: 1; }

@media (max-width: 779px) {
  /* alat pandang melipat; yang tersisa di baris itu cuma tombol lacinya */
    .hud-row.tools .hud-btn { display: none; }
  .hud-row.tools .hud-btn[data-hud-btn="belt"] { display: grid; }
  .hud-belt { display: flex; }
}`;

// Nama dan ikon baris dibaca dari tombolnya sendiri — `aria-label` yang sudah
// dipakai pembaca layar, dan ikon yang sama persis dengan yang dilipat. Satu
// sumber, jadi mengganti nama sebuah alat tidak bisa lupa mengganti nama
// kembarannya di sini.
const nama = btn => btn.getAttribute('aria-label') || btn.dataset.hudBtn || '';

export function createToolbelt(tools) {
  const belt = el('div', { class: 'hud-belt', 'data-hud-el': 'belt', role: 'menu', 'aria-hidden': 'true' });
  const rows = [];

  const btn = el('button', {
    class: 'hud-btn', 'data-hud-btn': 'belt', title: 'Views & tools',
    'aria-label': 'Views & tools', 'aria-expanded': 'false',
    onclick: () => toggle()
  }, [el('span', { class: 'ring' }), el('span', { class: 'arc' }), icon('belt')]);

  tools.forEach(src => {
    // Tombol yang memang tidak berlaku di ponsel tidak ikut turun ke laci.
    // Layar penuh salah satunya: Safari iOS tidak melayani Fullscreen API, dan
    // itulah kenapa ia sudah disembunyikan di breakpoint yang sama.
    if (src.dataset.hudBtn === 'full') return;
    const key = src.dataset.hudBtn;
    const label = el('span', { class: 'nm', text: nama(src) });
    const row = el('button', {
      class: 'row', role: 'menuitem', 'data-belt-row': key,
      onclick: () => { toggle(false); src.click(); }
    }, [icon(key), label, el('span', { class: 'st', text: 'ON' })]);
    rows.push({ row, src, label });
    belt.appendChild(row);
  });

  // Keadaan disalin saat laci dibuka, bukan diikuti terus-menerus. Sebuah
  // alat bisa menyala dari mana saja — kejadian scene, tombol lain, pemulihan
  // dari localStorage — dan menaruh pengawas di sembilan tombol demi panel
  // yang tertutup 99% waktunya jauh lebih mahal daripada membaca sekali di
  // saat yang satu-satunya penting.
  const sync = () => rows.forEach(({ row, src, label }) => {
    row.classList.toggle('on', src.classList.contains('on'));
    label.textContent = nama(src);
  });

  let open = false;
  const toggle = force => {
    open = force === undefined ? !open : !!force;
    if (open) sync();
    belt.classList.toggle('open', open);
    belt.setAttribute('aria-hidden', open ? 'false' : 'true');
    btn.classList.toggle('on', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  };

  // Ketukan di luar menutup lacinya. Fase capture supaya ia tetap menutup
  // walau yang disentuh adalah kanvas 3D yang menelan pointer-nya sendiri.
  addEventListener('pointerdown', e => {
    if (!open) return;
    if (e.target.closest && (e.target.closest('.hud-belt') || e.target.closest('[data-hud-btn="belt"]'))) return;
    toggle(false);
  }, true);

  addEventListener('keydown', e => { if (e.key === 'Escape' && open) toggle(false); });

  return { button: btn, node: belt, close: () => toggle(false) };
}

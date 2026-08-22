import { api, ApiError } from './api.js';
import { el, pasang, qs, kosongkan, toastGalat, drawer, bidang, input, ikon, inisial } from './ui.js';
import { tampilanBeranda } from './views/dashboard.js';
import { tampilanMenu } from './views/menus.js';
import { tampilanArtikel } from './views/articles.js';
import { tampilanAgenda } from './views/agenda.js';
import { tampilanSparing, tampilanPendaftaran } from './views/moderasi.js';
import { tampilanTaksonomi, tampilanPengaturan, tampilanAkun, tampilanAudit } from './views/pengaturan.js';
import { tampilanPemantauan, tampilanKejadian } from './views/pemantauan.js';

// Kerangka dashboard: login, navigasi, dan perutean berbasis hash.
//
// Hash, bukan History API, karena dashboard dilayani sebagai berkas statis dari
// Express. Dengan hash, memuat ulang di /admin#/artikel tetap mengambil
// index.html yang sama — tidak perlu aturan rewrite di server, dan tidak ada
// jalur 404 yang muncul hanya saat orang menekan F5.

// Tiap halaman membawa warnanya sendiri, dan warnanya bukan hiasan: ubin ikon
// di navigasi memakainya, jadi menu bisa dikenali dari sudut mata sebelum
// tulisannya terbaca. Nilainya diambil dari palet yang sama dengan planet di
// situsnya supaya dashboard dan tata surya terasa satu benda.
const HALAMAN = [
  { id: '', label: 'Beranda', ikon: 'beranda', warna: '#9E94F9', render: tampilanBeranda },
  { id: 'menu', label: 'Menu', ikon: 'menu', warna: '#a99bf2', render: tampilanMenu },
  { id: 'artikel', label: 'Artikel', ikon: 'artikel', warna: '#5ad1c0', render: tampilanArtikel },
  { id: 'agenda', label: 'Agenda', ikon: 'agenda', warna: '#f3f2f8', render: tampilanAgenda },
  { id: 'sparing', label: 'Sparing', ikon: 'sparing', warna: '#f2a65a', render: tampilanSparing, lencana: 'sparingPending' },
  { id: 'pendaftaran', label: 'Pendaftaran', ikon: 'pendaftaran', warna: '#6a5ae0', render: tampilanPendaftaran, lencana: 'submissionsNew' },
  { id: 'taksonomi', label: 'Taksonomi', ikon: 'taksonomi', warna: '#a99bf2', render: tampilanTaksonomi },
  { id: 'pengaturan', label: 'Pengaturan', ikon: 'pengaturan', warna: '#8f8aa3', render: tampilanPengaturan },
  { id: 'akun', label: 'Akun admin', ikon: 'akun', warna: '#9E94F9', render: tampilanAkun, hanyaOwner: true },
  { id: 'audit', label: 'Jejak audit', ikon: 'audit', warna: '#6c6782', render: tampilanAudit },
  { id: 'pemantauan', label: 'Pemantauan', ikon: 'pemantauan', warna: '#5ad1c0', render: tampilanPemantauan, hanyaOwner: true },
  // Tidak muncul di navigasi: dicapai dari tombol "Lihat semua" di halaman
  // pemantauan. Menu utama sudah sepuluh baris, dan halaman ini adalah
  // pendalaman dari satu panel di sana, bukan tujuan tersendiri.
  { id: 'kejadian', label: 'Kejadian keamanan', ikon: 'kejadian', warna: '#f2686a', render: tampilanKejadian, hanyaOwner: true, tersembunyi: true }
];

const akar = qs('#akar');
let aku = null;

// ── layar masuk ─────────────────────────────────────────────────────────────
function layarMasuk(pesan) {
  const form = el('form', { class: 'masuk-form' });
  const galatEl = el('p', { class: 'masuk-galat', hidden: !pesan }, pesan || '');

  pasang(form,
    galatEl,
    bidang('Email', input({
      name: 'email', type: 'email', required: true, autocomplete: 'username',
      autofocus: true, placeholder: 'nama@spatialindonesia.id'
    })),
    bidang('Kata sandi', input({
      name: 'password', type: 'password', required: true, autocomplete: 'current-password',
      placeholder: '••••••••••••'
    })),
    el('button', { type: 'submit', class: 'btn btn-utama btn-lebar' }, 'Masuk')
  );

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = new FormData(form);
    const tombol = form.querySelector('button');
    tombol.disabled = true;
    tombol.textContent = 'Memeriksa…';
    galatEl.hidden = true;
    try {
      const hasil = await api.login(d.get('email'), d.get('password'));
      aku = hasil.user;
      layarUtama();
    } catch (err) {
      // Pesannya diperbarui di tempat, bukan disisipkan baru tiap kegagalan.
      // Versi sebelumnya menumpuk satu baris merah per percobaan.
      galatEl.textContent = err.message;
      galatEl.hidden = false;
      tombol.disabled = false;
      tombol.textContent = 'Masuk';
    }
  });

  pasang(kosongkan(akar),
    el('div', { class: 'masuk' },
      el('div', { class: 'masuk-kartu' },
        // Tata surya kecil sebagai penanda halaman: matahari di tengah, dua
        // planet di orbitnya. Murni CSS — tidak ada gambar yang dimuat, dan
        // animasinya berhenti sendiri kalau pengguna meminta gerak dikurangi.
        el('div', { class: 'masuk-orbit', 'aria-hidden': 'true' },
          el('span', { class: 'orbit-matahari' }),
          el('span', { class: 'orbit-cincin orbit-cincin-1' }, el('i')),
          el('span', { class: 'orbit-cincin orbit-cincin-2' }, el('i'))),
        el('div', { class: 'masuk-kepala' },
          el('h1', {}, 'Spatial Indonesia'),
          el('p', {}, 'Pusat kendali tata surya')),
        form)));
}

// ── kerangka utama ──────────────────────────────────────────────────────────
function layarUtama() {
  const isi = el('main', { class: 'isi', id: 'isi', tabindex: '-1' });
  const navEl = el('nav', { class: 'nav', 'aria-label': 'Navigasi utama' });
  const jejakEl = el('div', { class: 'jejak-nav' });

  const daftar = HALAMAN.filter((h) => !h.hanyaOwner || aku.role === 'owner');
  // Halaman tersembunyi tetap bisa dibuka lewat hash, hanya tidak dicetak di
  // navigasi — dua daftar berbeda untuk dua kebutuhan berbeda.
  const terlihat = daftar.filter((h) => !h.tersembunyi);

  const gambarNav = (hitungan = {}) => {
    pasang(kosongkan(navEl),
      terlihat.map((h) => {
        const aktif = (location.hash.slice(2) || '') === h.id;
        const n = hitungan[h.lencana];
        return el(
          'a',
          {
            href: `#/${h.id}`,
            class: `nav-item${aktif ? ' aktif' : ''}`,
            // Warna halaman diteruskan sebagai custom property, bukan gaya
            // inline per properti — satu nilai menyetel ubin, cincin, dan
            // pendarnya sekaligus lewat CSS.
            style: { '--warna': h.warna },
            'aria-current': aktif ? 'page' : null
          },
          el('span', { class: 'nav-ubin' }, ikon(h.ikon)),
          el('span', { class: 'nav-teks' }, h.label),
          n ? el('span', { class: 'nav-lencana' }, String(n)) : null
        );
      })
    );

    const kini = daftar.find((h) => h.id === (location.hash.slice(2) || '')) ?? daftar[0];
    pasang(kosongkan(jejakEl),
      el('span', { class: 'jejak-akar' }, 'Dashboard'),
      el('span', { class: 'jejak-pisah' }, '/'),
      el('span', { class: 'jejak-kini', style: { '--warna': kini.warna } }, kini.label)
    );
  };

  const avatar = el('span', { class: 'avatar' }, inisial(aku.name));

  const topbar = el(
    'header',
    { class: 'topbar' },
    jejakEl,
    el('div', { class: 'topbar-aksi' },
      el('a', {
        class: 'ikon-btn', href: 'http://localhost:8899/index.html',
        target: '_blank', rel: 'noopener', title: 'Buka situs', 'aria-label': 'Buka situs di tab baru'
      }, ikon('situs')),
      el('a', {
        class: 'ikon-btn', href: '/docs', target: '_blank', rel: 'noopener',
        title: 'Dokumentasi API', 'aria-label': 'Buka dokumentasi API di tab baru'
      }, ikon('buku')),
      el('button', {
        class: 'ikon-btn', title: 'Ganti kata sandi', 'aria-label': 'Ganti kata sandi', onclick: gantiSandi
      }, ikon('kunci')),
      el('div', { class: 'pengguna' },
        avatar,
        el('span', { class: 'pengguna-teks' },
          el('strong', {}, aku.name),
          el('em', {}, aku.role))),
      el('button', {
        class: 'ikon-btn ikon-btn-keluar', title: 'Keluar', 'aria-label': 'Keluar dari dashboard', onclick: keluar
      }, ikon('keluar')))
  );

  pasang(kosongkan(akar),
    // Tautan pertama di halaman, tersembunyi sampai difokuskan. Sepuluh menu
    // navigasi yang harus dilewati setiap kali pindah halaman adalah salah satu
    // hal paling melelahkan bagi pengguna papan tik.
    el('a', { class: 'lewati', href: '#isi',
      onclick: (e) => { e.preventDefault(); isi.focus(); } }, 'Lewati ke isi'),
    el(
      'div',
      { class: 'kerangka' },
      el(
        'aside',
        { class: 'sisi' },
        el('a', { class: 'merek', href: '#/' },
          el('span', { class: 'merek-orb' }),
          el('span', { class: 'merek-teks' },
            el('strong', {}, 'Spatial Indonesia'),
            el('em', {}, 'Pusat kendali'))),
        navEl,
        el('div', { class: 'sisi-kaki' },
          el('span', { class: 'sisi-kaki-titik' }),
          el('span', {}, 'Semua sistem normal'))
      ),
      el('div', { class: 'utama' }, topbar, isi)
    )
  );

  const gambar = async () => {
    const id = location.hash.slice(2) || '';
    const halaman = daftar.find((h) => h.id === id) ?? daftar[0];
    gambarNav(await hitungLencana());
    // Warna halaman aktif dipakai seluruh kulit — pendar latar ikut berubah
    // saat berpindah menu, jadi perpindahannya terasa, bukan cuma tabel yang
    // berganti isi.
    document.documentElement.style.setProperty('--halaman', halaman.warna);
    isi.classList.add('isi-masuk');
    try {
      await halaman.render(isi, { aku });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return;
      pasang(kosongkan(isi), el('p', { class: 'galat' }, err.message));
    }
    // Animasi masuk dipicu ulang dengan melepas lalu memasang kelasnya; tanpa
    // reflow di antaranya, browser menggabungkan keduanya jadi bukan perubahan.
    isi.classList.remove('isi-masuk');
    void isi.offsetWidth;
    isi.classList.add('isi-masuk');
  };

  // Angka di samping menu ambil dari ringkasan yang sama dengan beranda —
  // satu permintaan, bukan satu per menu.
  const hitungLencana = async () => {
    try { return await api.get('/admin/dashboard'); } catch { return {}; }
  };

  window.addEventListener('hashchange', gambar);
  gambar();
}

async function gantiSandi() {
  const form = el('form', { class: 'form' });
  const { tutup } = drawer('Ganti kata sandi', form, { lebar: 'min(460px, 94vw)' });
  pasang(form,
    el('p', { class: 'redup kecil' }, 'Setelah diganti, semua sesi termasuk yang ini akan dicabut.'),
    bidang('Kata sandi sekarang', input({ name: 'currentPassword', type: 'password', required: true, autocomplete: 'current-password' })),
    bidang('Kata sandi baru', input({ name: 'newPassword', type: 'password', required: true, minLength: 12, autocomplete: 'new-password' }),
      { petunjuk: 'Minimal 12 karakter.' }),
    el('div', { class: 'form-aksi' },
      el('button', { type: 'button', class: 'btn', onclick: tutup }, 'Batal'),
      el('button', { type: 'submit', class: 'btn btn-utama' }, 'Ganti'))
  );
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = new FormData(form);
    try {
      await api.post('/auth/change-password', {
        currentPassword: d.get('currentPassword'), newPassword: d.get('newPassword')
      });
      tutup();
      layarMasuk('Kata sandi diganti. Masuk lagi dengan yang baru.');
    } catch (err) { toastGalat(err); }
  });
}

async function keluar() {
  try { await api.logout(); } catch { /* sesi mungkin memang sudah habis */ }
  aku = null;
  location.hash = '';
  layarMasuk();
}

// Kalau token kedaluwarsa dan refresh gagal, api.js memancarkan ini.
window.addEventListener('sesi-habis', () => {
  if (aku) { aku = null; layarMasuk('Sesi habis. Masuk lagi.'); }
});

// ── mulai ───────────────────────────────────────────────────────────────────
// Cookie sesi mungkin masih hidup dari kunjungan sebelumnya, jadi dicoba dulu
// sebelum menampilkan layar masuk — memaksa login ulang setiap muat ulang
// halaman adalah cara cepat membuat dashboard menjengkelkan.
try {
  aku = await api.me();
  layarUtama();
} catch {
  layarMasuk();
}

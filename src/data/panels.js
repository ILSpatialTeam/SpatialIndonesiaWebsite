// Isi panel yang muncul di dalam headset — versi ringkas dari panel DOM.
//
// Dua di antaranya tidak ditulis tangan: Insight membaca daftar artikel, dan
// Event membaca agenda. Jadi begitu datanya berubah (nanti dari API), panel di
// dalam headset ikut berubah tanpa ada yang perlu menyunting teks di sini.
import { ARTICLES, CATEGORIES } from './insight.js';
import { agendaState } from './agenda.js';

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
export const tanggalID = iso => {
  const [y, m, d] = iso.split('-').map(Number);
  return d + ' ' + BULAN[m - 1] + ' ' + y;
};

// Condensed content for the in-headset panels (the DOM panels keep the full version).
export const PANELS = {
  inti: {
    no: '00', tag: 'Inti', accent: '#9E94F9',
    title: 'Opening Access of Emerging Spatial Technology',
    lead: 'Teknologi spatial seharusnya bisa diakses siapa pun, dari mana pun di Indonesia.',
    items: [
      { k: '01', d: 'Membuat teknologi spatial lebih accessible bagi semua.' },
      { k: '02', d: 'Membangun kolaborasi untuk mendorong inovasi spatial.' },
      { k: '03', d: 'Mengembangkan talenta teknologi spatial masa depan.' },
      { k: '04', d: 'Menciptakan teknologi spatial yang meaningful dan berdampak.' }
    ]
  },
  program: {
    no: '01', tag: 'Program', accent: '#a99bf2',
    title: 'Program & kegiatan',
    lead: 'Semua terbuka untuk publik. Tidak perlu headset sendiri untuk mulai ikut.',
    items: [
      { k: 'Bulanan', t: 'XR Meetup', d: 'Demo karya, tanya jawab, coba perangkat bareng.' },
      { k: 'Belajar', t: 'Workshop & bootcamp', d: 'Kelas praktik: WebXR, Unity, three.js, desain interaksi.' },
      { k: 'Kolaborasi', t: 'Open Build', d: 'Proyek bareng lintas disiplin, dari ide sampai rilis.' },
      { k: 'Kampus', t: 'Kelas keliling', d: 'Pengenalan teknologi spatial ke kampus dan sekolah.' }
    ]
  },
  karya: {
    no: '02', tag: 'Karya', accent: '#9E94F9',
    title: 'Karya member',
    lead: 'Proyek VR, AR, dan XR yang dibangun oleh member komunitas.',
    items: [
      { k: 'VR · Edukasi', t: 'Judul proyek', d: 'Deskripsi singkat dan nama member pembuatnya.' },
      { k: 'AR · Budaya', t: 'Judul proyek', d: 'Deskripsi singkat dan nama member pembuatnya.' },
      { k: 'XR · Industri', t: 'Judul proyek', d: 'Deskripsi singkat dan nama member pembuatnya.' }
    ]
  },
  event: {
    no: '03', tag: 'Event', accent: '#f3f2f8',
    title: 'Event & meetup',
    lead: 'Jadwal terdekat komunitas.',
    // sumbernya sama dengan sudut planet Event dan papan misi di layar
    items: agendaState().list.filter(a => a.at >= Date.now()).slice(0, 4).map(a => ({
      k: a.kind, t: a.title, d: tanggalID(a.date) + ' · ' + a.place
    }))
  },
  insight: {
    no: '04', tag: 'Insight', accent: '#a99bf2',
    title: 'Sistem Insight',
    lead: 'Tiap artikel satu bulan yang mengorbit planet ini. Buka di layar biasa untuk membaca dan ikut sparing.',
    items: ARTICLES.filter(a => !a.archived).slice(0, 4).map(a => ({
      k: (CATEGORIES[a.cat] || {}).label || 'Insight', t: a.title, d: a.lead
    }))
  },
  tim: {
    no: '05', tag: 'Tim', accent: '#f3f2f8',
    title: 'Tim inti',
    lead: 'Relawan yang menjaga ritme komunitas.',
    items: [
      { k: '01', t: 'Nama', d: 'Peran' },
      { k: '02', t: 'Nama', d: 'Peran' },
      { k: '03', t: 'Nama', d: 'Peran' },
      { k: '04', t: 'Nama', d: 'Peran' }
    ]
  },
  gabung: {
    no: '06', tag: 'Gabung', accent: '#9E94F9',
    title: 'Ikut bangun ruangnya',
    lead: 'Gratis dan terbuka untuk semua level, tidak wajib punya headset, dari kota mana pun.',
    items: [
      { k: 'Langkah', t: 'Isi form pendaftaran', d: 'Buka planet Gabung di layar biasa untuk mengisi form.' },
      { k: 'Kanal', t: 'Instagram · Discord · LinkedIn', d: 'Sapa kami lebih dulu kalau mau kenalan.' }
    ]
  }
};

// Penanda planet. Ikonnya dipakai sebagai siluet berwarna palet — berkas
// aslinya penuh oranye, merah muda, dan biru muda yang bukan warna kita.
// Nilai tint di sini harus sama dengan [data-planet-icon] di index.html.
const PLANET_ICONS = {
  inti: { file: 'icon-1', from: '#cfc9ff', to: '#6a5ae0' },
  program: { file: 'icon-4', from: '#e0dbff', to: '#8b7ff0' },
  karya: { file: 'icon-3', from: '#c3baff', to: '#5f4fd8' },
  event: { file: 'icon-6', from: '#ffffff', to: '#a9a3c4' },
  insight: { file: 'icon-5', from: '#c2bbff', to: '#4b3ce0' },
  tim: { file: 'icon-2', from: '#ffffff', to: '#b5aed0' },
  gabung: { file: 'icon-7', from: '#d6d0ff', to: '#6a5ae0' }
};

// Rasi bintang dipakai nama langit Nusantara, bukan nama Latin: Waluku yang
// menandai musim tanam, Gubug Penceng yang dipakai nelayan mencari selatan.
// Pola bintangnya ditulis dalam koordinat bidang (x, y), lalu ditempel ke bola
// langit pada arah tertentu — jauh lebih mudah dirawat daripada koordinat 3D.
// Jakarta: langit yang dipakai selalu langit Indonesia, siapa pun yang membuka
// dan dari mana pun — itu justru intinya.
const SKY_LAT = -6.2, SKY_LON = 106.85, SKY_R = 168, MEET_ANGLE = 0;

const SKY = [
  {
    id: 'waluku', name: 'Waluku', note: 'Orion · penanda musim tanam',
    ra: 5.6, dec: 0, scale: 16,
    stars: [[-0.62, 1.02], [0.6, 1.06], [-0.2, 0.12], [0, 0], [0.2, -0.12], [-0.58, -0.98], [0.64, -1.0]],
    links: [[0, 2], [1, 4], [2, 3], [3, 4], [2, 5], [4, 6], [5, 6]]
  },
  {
    id: 'gubug', name: 'Gubug Penceng', note: 'Crux · penunjuk arah selatan',
    ra: 12.45, dec: -60, scale: 11,
    stars: [[0.04, 1], [-0.08, -1], [-0.78, 0.06], [0.8, -0.12], [0.42, -0.5]],
    links: [[0, 1], [2, 3]]
  },
  {
    id: 'kartika', name: 'Lintang Kartika', note: 'Pleiades · gugus tujuh bintang',
    ra: 3.79, dec: 24, scale: 7,
    stars: [[-0.5, 0.3], [-0.1, 0.62], [0.32, 0.4], [0.05, 0.08], [-0.36, -0.2], [0.45, -0.26], [-0.02, -0.56]],
    links: [[0, 1], [1, 2], [2, 3], [3, 0], [3, 4], [3, 5], [4, 6]]
  },
  {
    id: 'kalajengking', name: 'Kalajengking', note: 'Scorpius · ekor yang melengkung',
    ra: 16.8, dec: -30, scale: 15,
    stars: [[-0.9, 0.86], [-0.5, 0.7], [-0.16, 0.5], [0.02, 0.16], [0.1, -0.2], [0.34, -0.52], [0.68, -0.68], [0.94, -0.5], [0.86, -0.16]],
    links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8]]
  },
  {
    id: 'biduk', name: 'Biduk', note: 'Ursa Major · perahu di utara',
    ra: 11.6, dec: 56, scale: 13,
    stars: [[-1, 0.12], [-0.62, 0.3], [-0.24, 0.28], [0.06, 0.06], [0.42, 0.12], [0.6, -0.24], [0.16, -0.34]],
    links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3]]
  }
];

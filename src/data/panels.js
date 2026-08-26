// Isi panel yang muncul di dalam headset — versi ringkas dari panel DOM.
//
// Dua di antaranya tidak ditulis tangan: Insight membaca daftar artikel, dan
// Event membaca agenda. Jadi begitu datanya berubah (nanti dari API), panel di
// dalam headset ikut berubah tanpa ada yang perlu menyunting teks di sini.
import { ARTICLES, CATEGORIES } from './insight.js';
import { agendaState } from './agenda.js';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const tanggalID = iso => {
  const [y, m, d] = iso.split('-').map(Number);
  return MONTHS[m - 1] + ' ' + d + ', ' + y;
};

// Condensed content for the in-headset panels (the DOM panels keep the full version).
export const PANELS = {
  inti: {
    no: '00', tag: 'Core', accent: '#9E94F9',
    title: 'Opening Access of Emerging Spatial Technology',
    lead: 'Spatial technology should be accessible to anyone, from anywhere in Indonesia.',
    items: [
      { k: '01', d: 'Making spatial technology more accessible for everyone.' },
      { k: '02', d: 'Building collaboration to drive spatial innovation.' },
      { k: '03', d: 'Developing the next generation of spatial technology talent.' },
      { k: '04', d: 'Creating meaningful, impactful spatial technology.' }
    ]
  },
  program: {
    no: '01', tag: 'Program', accent: '#a99bf2',
    title: 'Programs & Activities',
    lead: 'All open to the public. No headset required to get started.',
    items: [
      { k: 'Monthly', t: 'XR Meetup', d: 'Demo showcases, Q&A sessions, and hands-on device trials.' },
      { k: 'Learn', t: 'Workshop & Bootcamp', d: 'Hands-on classes: WebXR, Unity, three.js, interaction design.' },
      { k: 'Collab', t: 'Open Build', d: 'Cross-disciplinary projects, from idea to release.' },
      { k: 'Campus', t: 'Touring Classes', d: 'Introducing spatial technology to universities and schools.' }
    ]
  },
  karya: {
    no: '02', tag: 'Showcase', accent: '#9E94F9',
    title: 'Member Showcase',
    lead: 'VR, AR, and XR projects built by community members.',
    items: [
      { k: 'VR · Education', t: 'Project title', d: 'Brief description and the member who built it.' },
      { k: 'AR · Culture', t: 'Project title', d: 'Brief description and the member who built it.' },
      { k: 'XR · Industry', t: 'Project title', d: 'Brief description and the member who built it.' }
    ]
  },
  event: {
    no: '03', tag: 'Event', accent: '#f3f2f8',
    title: 'Events & Meetups',
    lead: 'Upcoming community schedule.',
    // sumbernya sama dengan sudut planet Event dan papan misi di layar
    items: agendaState().list.filter(a => a.at >= Date.now()).slice(0, 4).map(a => ({
      k: a.kind, t: a.title, d: tanggalID(a.date) + ' · ' + a.place
    }))
  },
  insight: {
    no: '04', tag: 'Insight', accent: '#a99bf2',
    title: 'Insight System',
    lead: 'Each article is a moon orbiting this planet. Open on a regular screen to read and join the discussion.',
    items: ARTICLES.filter(a => !a.archived).slice(0, 4).map(a => ({
      k: (CATEGORIES[a.cat] || {}).label || 'Insight', t: a.title, d: a.lead
    }))
  },
  tim: {
    no: '05', tag: 'Team', accent: '#f3f2f8',
    title: 'Core Team',
    lead: 'Volunteers who keep the community going.',
    items: [
      { k: '01', t: 'Name', d: 'Role' },
      { k: '02', t: 'Name', d: 'Role' },
      { k: '03', t: 'Name', d: 'Role' },
      { k: '04', t: 'Name', d: 'Role' }
    ]
  },
  gabung: {
    no: '06', tag: 'Join', accent: '#9E94F9',
    title: 'Help build this space',
    lead: 'Free and open to all levels. No headset required, from any city.',
    items: [
      { k: 'Step', t: 'Fill out the signup form', d: 'Open the Join planet on a regular screen to fill out the form.' },
      { k: 'Channel', t: 'Instagram · Discord · LinkedIn', d: 'Say hello if you want to get acquainted first.' }
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

// Warna dan bentuk tata surya: satu-satunya tempat yang tahu ada berapa planet,
// sebesar apa, seberapa cepat mengorbit, dan ikon mana yang mewakilinya.
//
// Dipisahkan dari kode 3D supaya menambah atau mengganti planet tidak berarti
// menyentuh kode render sama sekali.

export const ACCENT = 0x6a5ae0, MINT = 0xa99bf2, PAPER = 0xf3f2f8, INK = 0x121116, DEEP = 0x2a1fc9;

// Tiap menu memakai permukaan planet sungguhan (`skin` → assets/planets/<nama>.jpg).
// Urutannya sengaja mengikuti urutan asli tata surya, jadi menu yang makin jauh
// dari matahari juga planet yang makin jauh — susunannya jadi bisa dibaca orang
// yang hafal tata surya, bukan acak.
//
//   Program  → Merkurius  planet tercepat mengelilingi matahari (88 hari), dan
//                         `speed` di sini memang yang paling tinggi
//   Karya    → Venus      benda paling terang di langit setelah matahari dan
//                         bulan — karya adalah yang paling terlihat dari luar
//   Event    → Bumi       satu-satunya tempat orang benar-benar berkumpul
//   Insight  → Mars       tujuan berikutnya; tempat gagasan diuji
//   Tim      → Jupiter    terbesar, dan punya bulan paling banyak
//   Gabung   → Saturnus   cincinnya adalah lingkaran yang mengelilingi;
//                         bergabung berarti masuk ke dalamnya
//
// `size` tidak memakai perbandingan asli — Jupiter sungguhan 28× Merkurius dan
// itu akan menghancurkan tata letak. Yang dipertahankan cuma *urutannya*:
// Merkurius < Mars < Venus < Bumi < Saturnus < Jupiter.
//
// `color` tetap ada dan tetap dipakai: label, orrery, radar, dan penanda 3D
// mengambil warnanya dari sini, dan sebelum teksturnya selesai dimuat bolanya
// tampil dengan warna itu.
export const PLANETS = [
  { id: 'program', label: 'Program', orbit: 11, size: 0.7, color: MINT, speed: 0.085, phase: 0.4, skin: 'mercury', tilt: 0.03 },
  { id: 'karya', label: 'Karya', orbit: 15.5, size: 0.98, color: ACCENT, speed: 0.062, phase: 2.1, skin: 'venus', tilt: 0.05 },
  { id: 'event', label: 'Event', orbit: 20, size: 1.02, color: PAPER, speed: 0.048, phase: 4.0, skin: 'earth', tilt: 0.41 },
  // deep blue reads as the far end of the brand gradient
  { id: 'insight', label: 'Insight', orbit: 25, size: 0.8, color: DEEP, speed: 0.038, phase: 5.4, skin: 'mars', tilt: 0.44 },
  { id: 'tim', label: 'Tim', orbit: 30, size: 1.5, color: PAPER, speed: 0.03, phase: 1.2, skin: 'jupiter', tilt: 0.05 },
  { id: 'gabung', label: 'Gabung', orbit: 35.5, size: 1.3, color: ACCENT, speed: 0.024, phase: 3.3, skin: 'saturn', tilt: 0.47, ring: true }
];

// Penanda planet. Ikonnya dipakai sebagai siluet berwarna palet — berkas
// aslinya penuh oranye, merah muda, dan biru muda yang bukan warna kita.
// Nilai tint di sini harus sama dengan [data-planet-icon] di index.html.
export const PLANET_ICONS = {
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

export const NAV = [{ id: 'inti', label: 'Inti — Visi & Misi' }].concat(PLANETS.map(p => ({ id: p.id, label: p.label })));

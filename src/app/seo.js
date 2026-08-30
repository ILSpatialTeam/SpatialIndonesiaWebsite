// Penyusun: data terstruktur untuk acara.
//
// Organization dan WebSite sudah ditulis langsung di <head> index.html — dua
// hal itu tidak pernah berubah, jadi tempatnya memang di HTML yang dikirim
// server. Yang ditulis di sini adalah daftar acara, dan daftar itu baru ada
// setelah /bootstrap menjawab.
//
// ── Kenapa acara, dan bukan yang lain ───────────────────────────────────────
//
// Dari semua isi situs ini, acara satu-satunya yang punya tipe schema.org
// dengan hasil kaya di halaman pencarian: tanggal, lokasi, dan status
// pendaftaran bisa tampil langsung di bawah tautannya. Artikel juga punya
// tipenya sendiri, tapi rich result-nya menuntut halaman per artikel — dan
// seluruh situs ini masih satu URL.
//
// ── Batas jujurnya ─────────────────────────────────────────────────────────
//
// Ditulis lewat JavaScript, jadi hanya perayap yang menjalankan JS yang
// melihatnya. Googlebot menjalankan JS; sebagian besar yang lain tidak. Selama
// daftar acaranya datang dari API saat halaman hidup, tidak ada cara lain
// tanpa merender halamannya di server lebih dulu.
import { AGENDA } from '../data/agenda.js';

const SITUS = document.querySelector('link[rel="canonical"]')?.href || location.origin + '/';

// Zona waktu ditulis eksplisit, bukan diserahkan ke peramban.
//
// `new Date('2026-09-11')` di peramban menghasilkan tengah malam UTC, dan bagi
// pembaca di WIB itu tanggal yang sama tapi jam 7 pagi — sementara acara jam
// 19:00 yang ditulis tanpa zona bisa terbaca sebagai hari berikutnya di mesin
// pencari yang membaca dari zona lain. Acara ini semuanya berlangsung di
// Indonesia, jadi offsetnya memang tetap.
const WIB = '+07:00';
const waktu = (tanggal, jam) => `${tanggal}T${jam ?? '00:00'}:00${WIB}`;

// "Daring" dan "Online" adalah satu-satunya nilai `place` yang bukan tempat
// fisik. Dibedakan karena schema.org punya bentuk tersendiri untuk keduanya,
// dan acara daring yang dilaporkan sebagai alamat fisik akan ditolak validator.
const daring = (tempat) => /^(daring|online|virtual|zoom)/i.test(String(tempat ?? '').trim());

function keEvent(a) {
  const reg = a.registration ?? { mode: 'none' };

  const dasar = {
    '@type': 'Event',
    name: a.title,
    startDate: waktu(a.date, a.startsAt),
    ...(a.endsAt ? { endDate: waktu(a.date, a.endsAt) } : {}),
    eventStatus: 'https://schema.org/EventScheduled',
    // Tanpa halaman per acara, tautannya menunjuk ke situsnya. Itu memang
    // tempat acaranya benar-benar bisa dibuka — kartunya ada di sana.
    url: SITUS,
    organizer: { '@type': 'Organization', name: 'Spatial Indonesia', url: SITUS },
    ...(a.note ? { description: a.note } : {})
  };

  if (daring(a.place)) {
    dasar.eventAttendanceMode = 'https://schema.org/OnlineEventAttendanceMode';
    dasar.location = { '@type': 'VirtualLocation', url: SITUS };
  } else {
    dasar.eventAttendanceMode = 'https://schema.org/OfflineEventAttendanceMode';
    dasar.location = {
      '@type': 'Place',
      name: a.place || 'Indonesia',
      address: { '@type': 'PostalAddress', addressLocality: a.place || undefined, addressCountry: 'ID' }
    };
  }

  // `offers` hanya untuk acara yang memang menerima pendaftaran. Acara terbuka
  // tidak punya "penawaran" apa pun, dan mengarang harga nol untuknya membuat
  // hasil pencarian menjanjikan tombol daftar yang tidak ada.
  if (reg.mode !== 'none') {
    dasar.offers = {
      '@type': 'Offer',
      // Semua acara komunitas ini gratis. Kalau suatu hari ada yang berbayar,
      // harganya harus datang dari data — bukan tetap nol di sini.
      price: '0',
      priceCurrency: 'IDR',
      url: SITUS,
      availability: reg.seatsLeft === 0
        ? 'https://schema.org/SoldOut'
        : 'https://schema.org/InStock'
    };
  }

  return dasar;
}

const HARI = 86_400_000;
const stempel = (iso) => {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return Date.UTC(y, m - 1, d, 5, 0, 0);
};

let simpul = null;

export function tulisAcara() {
  const sekarang = Date.now();
  // Hanya acara yang belum lewat. Acara tahun lalu tidak salah secara schema,
  // tapi tidak ada gunanya di hasil pencarian dan hanya memperbesar muatan.
  const mendatang = AGENDA
    .filter((a) => a.date && stempel(a.date) + HARI > sekarang)
    .sort((a, b) => stempel(a.date) - stempel(b.date))
    .slice(0, 20);

  // Tidak ada acara mendatang berarti blok datanya dibuang, bukan dibiarkan
  // berisi array kosong: `itemListElement: []` adalah pernyataan bahwa daftarnya
  // memang kosong, dan validator akan mengeluhkannya.
  if (!mendatang.length) {
    simpul?.remove();
    simpul = null;
    return 0;
  }

  const muatan = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Upcoming events — Spatial Indonesia',
    itemListElement: mendatang.map((a, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: keEvent(a)
    }))
  };

  // `isConnected` diperiksa, bukan hanya keberadaan variabelnya.
  //
  // <head> bukan milik kita: runtime Design Canvas memasang isi <helmet> ke
  // sana saat React merender, dan simpul yang kita tempelkan sebelum itu bisa
  // ikut terlepas. Yang tersisa lalu berupa variabel yang menunjuk simpul
  // yatim — menulisi `textContent`-nya tetap "berhasil" tanpa galat apa pun,
  // dan datanya tidak pernah sampai ke halaman.
  if (!simpul || !simpul.isConnected) {
    simpul = document.createElement('script');
    simpul.type = 'application/ld+json';
    simpul.dataset.seo = 'events';
    document.head.append(simpul);
  }
  simpul.textContent = JSON.stringify(muatan);
  return mendatang.length;
}

// ── kapan ditulis ───────────────────────────────────────────────────────────
//
// Runtime Design Canvas memasang isi <helmet> ke <head> saat React merender,
// dan simpul yang sudah kita tempelkan di sana ikut terlepas. Jadi menulis
// sekali di awal tidak cukup — harus ada yang memasangnya kembali.
//
// **Bukan `whenSettled`**, walau modul UI lain memakainya untuk hazard yang
// mirip. Fungsi itu menunggu satu bingkai lewat requestAnimationFrame, dan rAF
// berhenti total di tab latar belakang. Untuk HUD itu tidak apa-apa: yang tidak
// terlihat tidak perlu digambar. Untuk data terstruktur justru kebalikannya —
// pembacanya perayap, yang tidak pernah "melihat" halaman ini sama sekali, dan
// blok yang menunggu bingkai bisa tidak pernah ada saat halamannya dibaca.
//
// Yang dipakai karena itu tiga pemicu yang tidak satu pun bergantung pada
// bingkai: sekarang juga, saat `load`, dan saat <head> berubah.
tulisAcara();
addEventListener('load', tulisAcara);
document.addEventListener('data-ready', tulisAcara);

// Pengawas <head>: apa pun yang melepas simpul kita akan membangunkannya, dan
// `tulisAcara()` memasangnya lagi lewat pemeriksaan `isConnected`.
//
// `subtree` sengaja mati. Yang diamati cuma anak langsung <head>, sementara
// tulisan kita sendiri mengubah isi <script> — anak dari simpul kita, bukan
// dari <head>. Tanpa batas itu, modul ini membangunkan dirinya sendiri setiap
// kali menulis.
new MutationObserver(() => {
  if (!simpul || !simpul.isConnected) tulisAcara();
}).observe(document.head, { childList: true });

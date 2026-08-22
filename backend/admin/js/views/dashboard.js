import { api } from '../api.js';
import { el, pasang, kosongkan, tanggalID, lencana } from '../ui.js';

// Beranda dashboard: angka yang menuntut tindakan, bukan sekadar statistik.
//
// Yang ditampilkan hanya hal yang bisa ditindaklanjuti — sparing menunggu
// moderasi, pendaftaran belum dihubungi, acara berikutnya. Grafik jumlah
// kunjungan tidak ada di sini karena tidak ada yang bisa dikerjakan setelah
// melihatnya.
export async function tampilanBeranda(wadah, { aku } = {}) {
  pasang(kosongkan(wadah), el('p', { class: 'redup' }, 'Memuat…'));

  const [ringkas, agendaState, audit] = await Promise.all([
    api.get('/admin/dashboard'),
    api.get('/agenda/state'),
    api.get('/admin/audit', { limit: 8 })
  ]);

  const kartu = (judul, nilai, catatan, jenis) =>
    el('div', { class: `stat stat-${jenis || 'netral'}` },
      el('span', { class: 'stat-nilai' }, String(nilai)),
      el('span', { class: 'stat-judul' }, judul),
      catatan ? el('span', { class: 'stat-catatan' }, catatan) : null);

  const berikut = agendaState.next;

  // Sapaan mengikuti jam, bukan basa-basi tetap. Dashboard ini dibuka pagi
  // untuk menyiapkan agenda dan malam untuk memoderasi sparing — menyebut
  // waktunya membuat halaman terasa tahu sedang dipakai kapan.
  const jam = new Date().getHours();
  const sapa = jam < 11 ? 'Selamat pagi' : jam < 15 ? 'Selamat siang' : jam < 19 ? 'Selamat sore' : 'Selamat malam';
  const namaDepan = (aku?.name || '').split(' ')[0] || '';
  const menunggu = ringkas.sparingPending + ringkas.submissionsNew;

  pasang(kosongkan(wadah),
    el('div', { class: 'hero' },
      el('h1', {}, `${sapa}${namaDepan ? ', ' + namaDepan : ''}.`),
      el('p', {},
        menunggu
          ? `Ada ${menunggu} hal yang menunggu keputusanmu, dan acara berikutnya ${
              berikut ? 'tinggal ' + agendaState.days + ' hari lagi' : 'belum dijadwalkan'}.`
          : `Antrean bersih. ${berikut
              ? 'Acara berikutnya ' + agendaState.days + ' hari lagi'
              : 'Belum ada acara terjadwal'} — waktu yang bagus untuk menulis.`)),

    el('div', { class: 'stat-kisi' },
      kartu('Sparing menunggu moderasi', ringkas.sparingPending,
        ringkas.sparingPending ? 'Belum tampil di cincin artikel' : 'Antrean bersih',
        ringkas.sparingPending ? 'perhatian' : 'netral'),
      kartu('Pendaftaran baru', ringkas.submissionsNew,
        ringkas.submissionsNew ? 'Belum dihubungi' : 'Semua sudah ditangani',
        ringkas.submissionsNew ? 'perhatian' : 'netral'),
      kartu('Agenda terbit', ringkas.agendaCount, 'Menggerakkan planet Event'),
      kartu('Kategori artikel', ringkas.categoryCount)),

    el('div', { class: 'panel' },
      el('h2', {}, 'Acara berikutnya'),
      berikut
        ? el('div', { class: 'acara-sorot' },
            el('div', {},
              el('strong', {}, berikut.title),
              el('div', { class: 'redup kecil' }, `${tanggalID(berikut.date)} · ${berikut.place || 'lokasi belum diisi'}`)),
            el('div', { class: 'acara-hitung' },
              el('span', { class: 'acara-angka' }, String(agendaState.days)),
              el('span', { class: 'redup kecil' }, 'hari lagi')))
        : el('p', { class: 'redup' }, 'Tidak ada acara yang akan datang. Planet Event akan diam di Titik Temu.')),

    el('div', { class: 'panel' },
      el('h2', {}, 'Perubahan terakhir'),
      audit.items.length
        ? el('ul', { class: 'jejak' },
            audit.items.map((a) =>
              el('li', {},
                lencana(a.action, 'redup'),
                el('span', {}, ` ${a.entity}`),
                a.entity_id ? el('span', { class: 'redup kecil' }, ` ${a.entity_id.slice(0, 8)}`) : null,
                el('span', { class: 'redup kecil jejak-kanan' }, `${a.actor_email ?? 'sistem'} · ${tanggalID(a.created_at)}`))))
        : el('p', { class: 'redup' }, 'Belum ada aktivitas tercatat.'))
  );
}

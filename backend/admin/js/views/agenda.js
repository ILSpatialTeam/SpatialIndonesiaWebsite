import { api } from '../api.js';
import {
  el, pasang, kosongkan, tabel, lencana, toast, toastGalat, konfirmasi, drawer,
  bidang, input, textarea, select, tanggalID, tandaiGalat
} from '../ui.js';

// Agenda acara.
//
// Perlu diingat saat menyunting halaman ini: acara terdekat menentukan posisi
// planet Event di orbitnya. Menambah acara yang lebih dekat akan memindahkan
// planet itu di layar semua pengunjung — jadi peringatannya ditulis di halaman,
// bukan cuma di komentar kode.
const JENIS = ['MEETUP', 'WORKSHOP', 'KOLABORASI', 'KAMPUS', 'PAMERAN'];

export async function tampilanAgenda(wadah) {
  const isi = el('div');

  async function muat() {
    pasang(kosongkan(isi), el('p', { class: 'redup' }, 'Memuat…'));
    try {
      const items = await api.get('/admin/agenda');
      const hariIni = new Date().toISOString().slice(0, 10);
      pasang(kosongkan(isi),
        tabel(
          [
            { judul: 'Jenis', lebar: '120px', sel: (a) => lencana(a.kind, 'ungu') },
            {
              judul: 'Acara',
              sel: (a) => el('div', {},
                el('strong', {}, a.title),
                a.note ? el('div', { class: 'redup kecil' }, a.note) : null)
            },
            {
              judul: 'Tanggal',
              lebar: '130px',
              sel: (a) => el('div', {},
                tanggalID(a.date),
                a.date < hariIni ? el('div', { class: 'redup kecil' }, 'sudah lewat') : null)
            },
            { judul: 'Tempat', lebar: '120px', sel: (a) => a.place || '—' },
            {
              judul: '',
              lebar: '178px',
              sel: (a) => el('div', { class: 'aksi-baris' },
                el('button', { class: 'btn btn-kecil', onclick: () => bukaAgenda(a, muat) }, 'Sunting'),
                el('button', {
                  class: 'btn btn-kecil btn-bahaya',
                  onclick: async () => {
                    if (!(await konfirmasi(`Hapus "${a.title}"? Kalau ini acara terdekat, planet Event akan berpindah.`))) return;
                    try {
                      await api.del(`/admin/agenda/${a.id}`);
                      toast('Agenda dihapus.', 'sukses');
                      muat();
                    } catch (err) { toastGalat(err); }
                  }
                }, 'Hapus'))
            }
          ],
          items,
          { kosong: 'Belum ada agenda.' }
        )
      );
    } catch (err) {
      pasang(kosongkan(isi), el('p', { class: 'galat' }, err.message));
    }
  }

  pasang(kosongkan(wadah),
    el('div', { class: 'halaman-kepala' },
      el('div', {},
        el('h1', {}, 'Agenda'),
        el('p', { class: 'redup' }, 'Acara terdekat menentukan posisi planet Event di orbitnya.')),
      el('button', { class: 'btn btn-utama', onclick: () => bukaAgenda(null, muat) }, '+ Tambah acara')),
    isi
  );
  await muat();
}

function bukaAgenda(acara, setelahSimpan) {
  const baru = !acara;
  const form = el('form', { class: 'form' });
  const { tutup } = drawer(baru ? 'Tambah acara' : `Sunting: ${acara.title}`, form);
  const v = acara ?? { kind: 'MEETUP', title: '', date: '', place: '', note: '', url: '', isPublished: true };

  pasang(form,
    bidang('Judul', input({ name: 'title', value: v.title, required: true }), { nama: 'title' }),
    el('div', { class: 'baris-2' },
      bidang('Jenis', select(JENIS.map((k) => ({ value: k, label: k, selected: k === v.kind })), { name: 'kind' }),
        { nama: 'kind' }),
      bidang('Tanggal', input({ name: 'date', type: 'date', value: v.date, required: true }), { nama: 'date' })),
    el('div', { class: 'baris-2' },
      bidang('Tempat', input({ name: 'place', value: v.place }), { nama: 'place' }),
      bidang('Ditampilkan', select(
        [{ value: 'true', label: 'Ya', selected: v.isPublished !== false },
         { value: 'false', label: 'Tidak', selected: v.isPublished === false }],
        { name: 'isPublished' }
      ), { nama: 'isPublished' })),
    bidang('Catatan', textarea({ name: 'note', value: v.note, rows: 2 }), { nama: 'note' }),
    bidang('Tautan pendaftaran', input({ name: 'url', type: 'url', value: v.url ?? '' }),
      { nama: 'url', petunjuk: 'Opsional.' }),
    el('div', { class: 'form-aksi' },
      el('button', { type: 'button', class: 'btn', onclick: tutup }, 'Batal'),
      el('button', { type: 'submit', class: 'btn btn-utama' }, baru ? 'Tambah' : 'Simpan'))
  );

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = new FormData(form);
    const muatan = {
      kind: d.get('kind'), title: d.get('title'), date: d.get('date'),
      place: d.get('place') || '', note: d.get('note') || '',
      url: d.get('url') || null, isPublished: d.get('isPublished') === 'true'
    };
    const tombol = form.querySelector('button[type=submit]');
    tombol.disabled = true;
    try {
      if (baru) await api.post('/admin/agenda', muatan);
      else await api.patch(`/admin/agenda/${acara.id}`, muatan);
      toast('Agenda disimpan.', 'sukses');
      tutup();
      setelahSimpan();
    } catch (err) {
      tandaiGalat(form, err.details);
      toastGalat(err);
    } finally {
      tombol.disabled = false;
    }
  });
}

import { api } from '../api.js';
import { el, pasang, kosongkan, tabel, lencana, toast, toastGalat, konfirmasi, tanggalID, select } from '../ui.js';

// Moderasi sparing dan pendaftaran Gabung — dua antrean yang bentuk kerjanya
// sama: baca, putuskan, lanjut.

const FREK = { sinyal: 'biru', observasi: 'hijau', sonde: 'netral', anomali: 'perhatian' };

// ── pemilihan massal ────────────────────────────────────────────────────────
//
// Antrean moderasi bisa menumpuk. Menyetujui delapan puluh sparing satu per
// satu berarti delapan puluh klik, dan halaman digambar ulang di antara setiap
// klik sehingga posisi gulirnya hilang terus.
//
// Permintaannya tetap satu per satu ke server — endpoint massal berarti
// permukaan baru yang harus divalidasi, dibatasi laju, dan diaudit sendiri —
// tapi dikirim bersamaan dan halamannya digambar ulang sekali saja di akhir.
function buatPemilih(muat) {
  const dipilih = new Set();
  const bar = el('div', { class: 'pilih-bar', hidden: true, role: 'toolbar', 'aria-label': 'Aksi massal' });
  let aksiKini = [];

  const segarkanBar = () => {
    bar.hidden = dipilih.size === 0;
    if (bar.hidden) return;
    pasang(kosongkan(bar),
      el('span', { class: 'pilih-jumlah' }, `${dipilih.size} dipilih`),
      ...aksiKini.map(({ label, kelas, jalankan, konfirmasiTeks }) =>
        el('button', {
          class: `btn btn-kecil ${kelas ?? ''}`,
          onclick: async () => {
            if (konfirmasiTeks && !(await konfirmasi(konfirmasiTeks(dipilih.size)))) return;
            const daftar = [...dipilih];
            bar.querySelectorAll('button').forEach((b) => { b.disabled = true; });
            // allSettled, bukan all: satu kegagalan tidak boleh membatalkan
            // sisanya, dan pengguna berhak tahu berapa yang berhasil.
            const hasil = await Promise.allSettled(daftar.map(jalankan));
            const gagal = hasil.filter((h) => h.status === 'rejected').length;
            dipilih.clear();
            toast(gagal
              ? `${daftar.length - gagal} berhasil, ${gagal} gagal.`
              : `${daftar.length} item diproses.`, gagal ? 'galat' : 'sukses');
            muat();
          }
        }, label)),
      el('button', {
        class: 'btn btn-kecil',
        onclick: () => {
          dipilih.clear();
          document.querySelectorAll('.pilih-kotak').forEach((c) => { c.checked = false; });
          segarkanBar();
        }
      }, 'Batal pilih'));
  };

  return {
    bar,
    dipilih,
    siapkan(aksi) { aksiKini = aksi; dipilih.clear(); segarkanBar(); },
    kolom(semuaId) {
      return {
        judul: el('input', {
          type: 'checkbox', class: 'pilih-kotak', 'aria-label': 'Pilih semua baris',
          onchange: (e) => {
            dipilih.clear();
            if (e.target.checked) semuaId.forEach((id) => dipilih.add(id));
            document.querySelectorAll('tbody .pilih-kotak').forEach((c) => { c.checked = e.target.checked; });
            segarkanBar();
          }
        }),
        lebar: '38px',
        sel: (r) => el('input', {
          type: 'checkbox', class: 'pilih-kotak', 'aria-label': 'Pilih baris ini',
          onchange: (e) => {
            if (e.target.checked) dipilih.add(r.id); else dipilih.delete(r.id);
            segarkanBar();
          }
        })
      };
    }
  };
}

export async function tampilanSparing(wadah) {
  const keadaan = { status: 'pending', offset: 0, limit: 25 };
  const isi = el('div');
  const pemilih = buatPemilih(() => muat());

  async function muat() {
    pasang(kosongkan(isi), el('p', { class: 'redup' }, 'Memuat…'));
    try {
      const { items, total } = await api.get('/admin/sparing', keadaan);
      const aksi = async (id, status, pesan) => {
        try { await api.patch(`/admin/sparing/${id}`, { status }); toast(pesan, 'sukses'); muat(); }
        catch (err) { toastGalat(err); }
      };
      pemilih.siapkan([
        { label: 'Setujui semua', kelas: 'btn-utama', jalankan: (id) => api.patch(`/admin/sparing/${id}`, { status: 'approved' }) },
        { label: 'Tolak semua', jalankan: (id) => api.patch(`/admin/sparing/${id}`, { status: 'rejected' }) },
        {
          label: 'Hapus semua', kelas: 'btn-bahaya',
          konfirmasiTeks: (n) => `Hapus ${n} sparing permanen? Tindakan ini tidak bisa dibatalkan.`,
          jalankan: (id) => api.del(`/admin/sparing/${id}`)
        }
      ]);
      pasang(kosongkan(isi),
        el('p', { class: 'redup kecil' }, `${total} sparing berstatus "${keadaan.status || 'semua'}"`),
        pemilih.bar,
        tabel(
          [
            pemilih.kolom(items.map((x) => x.id)),
            { judul: 'Frekuensi', lebar: '110px', sel: (s) => lencana(s.freq, FREK[s.freq]) },
            { judul: 'Pengirim', lebar: '120px', sel: (s) => s.name },
            {
              judul: 'Isi',
              sel: (s) => el('div', {},
                el('p', { class: 'sparing-teks' }, s.text),
                el('div', { class: 'redup kecil' }, `pada "${s.articleTitle}" · ${tanggalID(s.createdAt)}`))
            },
            { judul: 'Boost', lebar: '60px', sel: (s) => String(s.boost) },
            {
              judul: '',
              lebar: '215px',
              sel: (s) => el('div', { class: 'aksi-baris' },
                s.status !== 'approved'
                  ? el('button', { class: 'btn btn-kecil btn-utama', onclick: () => aksi(s.id, 'approved', 'Sparing ditampilkan.') }, 'Setujui')
                  : null,
                s.status !== 'rejected'
                  ? el('button', { class: 'btn btn-kecil', onclick: () => aksi(s.id, 'rejected', 'Sparing ditolak.') }, 'Tolak')
                  : null,
                el('button', {
                  class: 'btn btn-kecil btn-bahaya',
                  onclick: async () => {
                    if (!(await konfirmasi('Hapus sparing ini permanen?'))) return;
                    try { await api.del(`/admin/sparing/${s.id}`); toast('Terhapus.', 'sukses'); muat(); }
                    catch (err) { toastGalat(err); }
                  }
                }, 'Hapus'))
            }
          ],
          items,
          { kosong: 'Antrean bersih.' }
        )
      );
    } catch (err) {
      pasang(kosongkan(isi), el('p', { class: 'galat' }, err.message));
    }
  }

  pasang(kosongkan(wadah),
    el('div', { class: 'halaman-kepala' },
      el('div', {},
        el('h1', {}, 'Sparing'),
        el('p', { class: 'redup' }, 'Komentar pembaca yang mengorbit artikel. Yang disetujui langsung muncul di cincin.')),
      select(
        [
          { value: 'pending', label: 'Menunggu', selected: true },
          { value: 'approved', label: 'Disetujui' },
          { value: 'rejected', label: 'Ditolak' },
          { value: '', label: 'Semua' }
        ],
        { onchange: (e) => { keadaan.status = e.target.value; keadaan.offset = 0; muat(); } }
      )),
    isi
  );
  await muat();
}

export async function tampilanPendaftaran(wadah) {
  const keadaan = { status: 'new', offset: 0, limit: 25 };
  const isi = el('div');
  const pemilih = buatPemilih(() => muat());

  async function muat() {
    pasang(kosongkan(isi), el('p', { class: 'redup' }, 'Memuat…'));
    try {
      const { items, total } = await api.get('/admin/submissions', keadaan);
      const ubah = async (id, status) => {
        try { await api.patch(`/admin/submissions/${id}`, { status }); toast('Status diperbarui.', 'sukses'); muat(); }
        catch (err) { toastGalat(err); }
      };
      pemilih.siapkan([
        { label: 'Tandai sudah dihubungi', kelas: 'btn-utama', jalankan: (id) => api.patch(`/admin/submissions/${id}`, { status: 'contacted' }) },
        { label: 'Arsipkan semua', jalankan: (id) => api.patch(`/admin/submissions/${id}`, { status: 'archived' }) },
        {
          label: 'Hapus semua', kelas: 'btn-bahaya',
          konfirmasiTeks: (n) => `Hapus ${n} pendaftaran permanen?`,
          jalankan: (id) => api.del(`/admin/submissions/${id}`)
        }
      ]);
      pasang(kosongkan(isi),
        el('p', { class: 'redup kecil' }, `${total} pendaftaran`),
        pemilih.bar,
        tabel(
          [
            pemilih.kolom(items.map((x) => x.id)),
            { judul: 'Nama', lebar: '178px', sel: (s) => el('strong', {}, s.name) },
            {
              judul: 'Kontak',
              sel: (s) => el('div', {},
                el('a', { href: `mailto:${s.email}`, class: 'tautan' }, s.email),
                s.focus ? el('div', { class: 'redup kecil' }, s.focus) : null,
                s.message ? el('p', { class: 'sparing-teks' }, s.message) : null)
            },
            { judul: 'Masuk', lebar: '110px', sel: (s) => tanggalID(s.created_at) },
            {
              judul: 'Status',
              lebar: '110px',
              sel: (s) => lencana(s.status, s.status === 'new' ? 'perhatian' : s.status === 'contacted' ? 'hijau' : 'redup')
            },
            {
              judul: '',
              lebar: '240px',
              sel: (s) => el('div', { class: 'aksi-baris' },
                s.status !== 'contacted'
                  ? el('button', { class: 'btn btn-kecil btn-utama', onclick: () => ubah(s.id, 'contacted') }, 'Sudah dihubungi')
                  : null,
                s.status !== 'archived'
                  ? el('button', { class: 'btn btn-kecil', onclick: () => ubah(s.id, 'archived') }, 'Arsipkan')
                  : null,
                el('button', {
                  class: 'btn btn-kecil btn-bahaya',
                  onclick: async () => {
                    if (!(await konfirmasi(`Hapus pendaftaran ${s.name}?`))) return;
                    try { await api.del(`/admin/submissions/${s.id}`); toast('Terhapus.', 'sukses'); muat(); }
                    catch (err) { toastGalat(err); }
                  }
                }, 'Hapus'))
            }
          ],
          items,
          { kosong: 'Belum ada pendaftaran.' }
        )
      );
    } catch (err) {
      pasang(kosongkan(isi), el('p', { class: 'galat' }, err.message));
    }
  }

  pasang(kosongkan(wadah),
    el('div', { class: 'halaman-kepala' },
      el('div', {},
        el('h1', {}, 'Pendaftaran'),
        el('p', { class: 'redup' }, 'Kiriman dari formulir di planet Gabung.')),
      select(
        [
          { value: 'new', label: 'Baru', selected: true },
          { value: 'contacted', label: 'Sudah dihubungi' },
          { value: 'archived', label: 'Diarsipkan' },
          { value: '', label: 'Semua' }
        ],
        { onchange: (e) => { keadaan.status = e.target.value; keadaan.offset = 0; muat(); } }
      )),
    isi
  );
  await muat();
}

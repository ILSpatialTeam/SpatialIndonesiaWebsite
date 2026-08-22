import { api } from '../api.js';
import {
  el, pasang, kosongkan, tabel, lencana, toast, toastGalat, konfirmasi, drawer,
  bidang, input, select, tanggalID, tandaiGalat
} from '../ui.js';

// Taksonomi, pengaturan situs, akun admin, dan jejak audit.
//
// Empat hal yang jarang disentuh, dikumpulkan di satu bagian supaya menu utama
// tetap pendek dan berisi hal yang dikerjakan sehari-hari.

export async function tampilanTaksonomi(wadah) {
  const isi = el('div');

  async function muat() {
    pasang(kosongkan(isi), el('p', { class: 'redup' }, 'Memuat…'));
    const { categories, frequencies } = await api.get('/admin/taxonomy');

    const contoh = (warna) => el('span', { class: 'warna-contoh', style: { background: warna } });

    pasang(kosongkan(isi),
      el('div', { class: 'panel' },
        el('div', { class: 'panel-kepala' },
          el('h2', {}, 'Kategori artikel'),
          el('button', { class: 'btn btn-kecil btn-utama', onclick: () => bukaKategori(null, muat) }, '+ Kategori')),
        tabel(
          [
            { judul: '', lebar: '40px', sel: (c) => contoh(c.color) },
            { judul: 'Label', sel: (c) => el('strong', {}, c.label) },
            { judul: 'Id', lebar: '168px', sel: (c) => el('code', {}, c.id) },
            { judul: 'Urutan', lebar: '70px', sel: (c) => String(c.position) },
            {
              judul: '',
              lebar: '168px',
              sel: (c) => el('div', { class: 'aksi-baris' },
                el('button', { class: 'btn btn-kecil', onclick: () => bukaKategori(c, muat) }, 'Sunting'),
                el('button', {
                  class: 'btn btn-kecil btn-bahaya',
                  onclick: async () => {
                    if (!(await konfirmasi(`Hapus kategori "${c.label}"?`))) return;
                    try { await api.del(`/admin/taxonomy/categories/${c.id}`); toast('Terhapus.', 'sukses'); muat(); }
                    catch (err) { toastGalat(err); }
                  }
                }, 'Hapus'))
            }
          ],
          categories
        )),

      el('div', { class: 'panel' },
        el('div', { class: 'panel-kepala' },
          el('h2', {}, 'Frekuensi sparing'),
          el('button', { class: 'btn btn-kecil btn-utama', onclick: () => bukaFrekuensi(null, muat) }, '+ Frekuensi')),
        el('p', { class: 'redup kecil' },
          'Empat jenis kontribusi yang memaksa pembaca memilih maksud tulisannya sebelum mengirim.'),
        tabel(
          [
            { judul: '', lebar: '40px', sel: (f) => contoh(f.color) },
            { judul: 'Glif', lebar: '50px', sel: (f) => el('span', { class: 'glif' }, f.glyph) },
            { judul: 'Label', lebar: '130px', sel: (f) => el('strong', {}, f.label) },
            { judul: 'Petunjuk', sel: (f) => el('span', { class: 'redup' }, f.hint) },
            {
              judul: '',
              lebar: '90px',
              sel: (f) => el('button', { class: 'btn btn-kecil', onclick: () => bukaFrekuensi(f, muat) }, 'Sunting')
            }
          ],
          frequencies
        ))
    );
  }

  pasang(kosongkan(wadah),
    el('div', { class: 'halaman-kepala' },
      el('div', {}, el('h1', {}, 'Taksonomi'), el('p', { class: 'redup' }, 'Kategori artikel dan frekuensi sparing.'))),
    isi
  );
  await muat();
}

function bukaKategori(c, setelahSimpan) {
  const baru = !c;
  const form = el('form', { class: 'form' });
  const { tutup } = drawer(baru ? 'Kategori baru' : `Sunting: ${c.label}`, form, { lebar: 'min(480px, 94vw)' });
  pasang(form,
    bidang('Label', input({ name: 'label', value: c?.label ?? '', required: true }), { nama: 'label' }),
    bidang('Id', input({ name: 'id', value: c?.id ?? '', readOnly: !baru, placeholder: 'otomatis dari label' }),
      { nama: 'id', petunjuk: baru ? 'Kosongkan untuk dibuat dari label.' : 'Id tidak bisa diubah.' }),
    bidang('Warna', input({ name: 'color', type: 'color', value: c?.color ?? '#9E94F9' }), { nama: 'color' }),
    el('div', { class: 'form-aksi' },
      el('button', { type: 'button', class: 'btn', onclick: tutup }, 'Batal'),
      el('button', { type: 'submit', class: 'btn btn-utama' }, 'Simpan'))
  );
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = new FormData(form);
    try {
      await api.put('/admin/taxonomy/categories', {
        id: d.get('id') || undefined, label: d.get('label'), color: d.get('color')
      });
      toast('Kategori disimpan.', 'sukses'); tutup(); setelahSimpan();
    } catch (err) { tandaiGalat(form, err.details); toastGalat(err); }
  });
}

function bukaFrekuensi(f, setelahSimpan) {
  const baru = !f;
  const form = el('form', { class: 'form' });
  const { tutup } = drawer(baru ? 'Frekuensi baru' : `Sunting: ${f.label}`, form, { lebar: 'min(520px, 94vw)' });
  pasang(form,
    el('div', { class: 'baris-2' },
      bidang('Label', input({ name: 'label', value: f?.label ?? '', required: true }), { nama: 'label' }),
      bidang('Glif', input({ name: 'glyph', value: f?.glyph ?? '▲', maxLength: 4, required: true }),
        { nama: 'glyph', petunjuk: 'Simbol satelit di scene.' })),
    bidang('Id', input({ name: 'id', value: f?.id ?? '', readOnly: !baru, placeholder: 'otomatis dari label' }), { nama: 'id' }),
    bidang('Warna', input({ name: 'color', type: 'color', value: f?.color ?? '#9E94F9' }), { nama: 'color' }),
    bidang('Petunjuk', input({ name: 'hint', value: f?.hint ?? '' }),
      { nama: 'hint', petunjuk: 'Teks yang muncul saat pembaca memilih frekuensi ini.' }),
    el('div', { class: 'form-aksi' },
      el('button', { type: 'button', class: 'btn', onclick: tutup }, 'Batal'),
      el('button', { type: 'submit', class: 'btn btn-utama' }, 'Simpan'))
  );
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = new FormData(form);
    try {
      await api.put('/admin/taxonomy/frequencies', {
        id: d.get('id') || undefined, label: d.get('label'), glyph: d.get('glyph'),
        color: d.get('color'), hint: d.get('hint') ?? ''
      });
      toast('Frekuensi disimpan.', 'sukses'); tutup(); setelahSimpan();
    } catch (err) { tandaiGalat(form, err.details); toastGalat(err); }
  });
}

// ── pengaturan situs ────────────────────────────────────────────────────────
const KETERANGAN = {
  'insight.fresh_days': 'Berapa hari sebuah artikel dianggap "baru" dan menyala di orbitnya.',
  'insight.sparing_moderation': 'true = sparing masuk antrean dulu. false = langsung tampil.',
  'presence.limit': 'Berapa jejak penjelajah terakhir yang digambar di scene.',
  'site.name': 'Nama situs.',
  'site.tagline': 'Kalimat pendek di bawah nama.'
};

export async function tampilanPengaturan(wadah) {
  const isi = el('div');

  async function muat() {
    pasang(kosongkan(isi), el('p', { class: 'redup' }, 'Memuat…'));
    const semua = await api.get('/admin/settings');
    const form = el('form', { class: 'form' });

    for (const [kunci, nilai] of Object.entries(semua)) {
      const isBool = typeof nilai === 'boolean';
      const kendali = isBool
        ? select([{ value: 'true', label: 'Ya', selected: nilai }, { value: 'false', label: 'Tidak', selected: !nilai }],
            { dataset: { kunci, jenis: 'bool' } })
        : input({
            value: typeof nilai === 'string' ? nilai : JSON.stringify(nilai),
            dataset: { kunci, jenis: typeof nilai === 'number' ? 'number' : 'string' }
          });
      pasang(form, bidang(kunci, kendali, { nama: kunci, petunjuk: KETERANGAN[kunci] }));
    }

    pasang(form, el('div', { class: 'form-aksi' },
      el('button', { type: 'submit', class: 'btn btn-utama' }, 'Simpan semua')));

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const kendali = [...form.querySelectorAll('[data-kunci]')];
      try {
        // Dikirim satu per satu, tapi berbarengan. Endpointnya per-kunci karena
        // itu yang membuat jejak audit menyebut pengaturan mana yang berubah.
        await Promise.all(kendali.map((k) => {
          const { kunci, jenis } = k.dataset;
          const nilai = jenis === 'bool' ? k.value === 'true' : jenis === 'number' ? Number(k.value) : k.value;
          return api.put(`/admin/settings/${kunci}`, { value: nilai });
        }));
        toast('Pengaturan disimpan.', 'sukses');
        muat();
      } catch (err) { toastGalat(err); }
    });

    pasang(kosongkan(isi), form);
  }

  pasang(kosongkan(wadah),
    el('div', { class: 'halaman-kepala' },
      el('div', {}, el('h1', {}, 'Pengaturan'), el('p', { class: 'redup' }, 'Nilai yang dibaca situs dan dashboard.'))),
    isi
  );
  await muat();
}

// ── akun admin ──────────────────────────────────────────────────────────────
export async function tampilanAkun(wadah, { aku }) {
  const isi = el('div');

  async function muat() {
    pasang(kosongkan(isi), el('p', { class: 'redup' }, 'Memuat…'));
    try {
      const users = await api.get('/admin/users');
      pasang(kosongkan(isi),
        tabel(
          [
            {
              judul: 'Nama',
              sel: (u) => el('div', {},
                el('strong', {}, u.name),
                el('div', { class: 'redup kecil' }, u.email),
                u.id === aku.id ? el('div', { class: 'redup kecil' }, '(akun Anda)') : null)
            },
            { judul: 'Peran', lebar: '90px', sel: (u) => lencana(u.role, u.role === 'owner' ? 'ungu' : 'netral') },
            { judul: 'Aktif', lebar: '80px', sel: (u) => (u.is_active ? lencana('aktif', 'hijau') : lencana('mati', 'redup')) },
            { judul: 'Masuk terakhir', lebar: '130px', sel: (u) => tanggalID(u.last_login_at) },
            {
              judul: '',
              lebar: '178px',
              sel: (u) => el('div', { class: 'aksi-baris' },
                el('button', { class: 'btn btn-kecil', onclick: () => bukaAkun(u, muat) }, 'Sunting'),
                u.id !== aku.id
                  ? el('button', {
                      class: 'btn btn-kecil btn-bahaya',
                      onclick: async () => {
                        if (!(await konfirmasi(`Hapus akun ${u.email}?`))) return;
                        try { await api.del(`/admin/users/${u.id}`); toast('Akun dihapus.', 'sukses'); muat(); }
                        catch (err) { toastGalat(err); }
                      }
                    }, 'Hapus')
                  : null)
            }
          ],
          users
        )
      );
    } catch (err) {
      pasang(kosongkan(isi), el('p', { class: 'galat' },
        err.status === 403 ? 'Hanya akun owner yang bisa mengelola akun admin.' : err.message));
    }
  }

  pasang(kosongkan(wadah),
    el('div', { class: 'halaman-kepala' },
      el('div', {}, el('h1', {}, 'Akun admin'), el('p', { class: 'redup' }, 'Hanya owner yang bisa mengubah halaman ini.')),
      el('button', { class: 'btn btn-utama', onclick: () => bukaAkun(null, muat) }, '+ Tambah akun')),
    isi
  );
  await muat();
}

function bukaAkun(u, setelahSimpan) {
  const baru = !u;
  const form = el('form', { class: 'form' });
  const { tutup } = drawer(baru ? 'Akun baru' : `Sunting: ${u.email}`, form, { lebar: 'min(520px, 94vw)' });
  pasang(form,
    bidang('Nama', input({ name: 'name', value: u?.name ?? '', required: true }), { nama: 'name' }),
    bidang('Email', input({ name: 'email', type: 'email', value: u?.email ?? '', required: true }), { nama: 'email' }),
    bidang('Kata sandi', input({ name: 'password', type: 'password', required: baru, minLength: 12, autocomplete: 'new-password' }),
      { nama: 'password', petunjuk: baru ? 'Minimal 12 karakter.' : 'Kosongkan kalau tidak diganti. Mengganti akan mencabut semua sesinya.' }),
    el('div', { class: 'baris-2' },
      bidang('Peran', select(
        [{ value: 'editor', label: 'editor', selected: u?.role !== 'owner' },
         { value: 'owner', label: 'owner', selected: u?.role === 'owner' }],
        { name: 'role' }
      ), { nama: 'role' }),
      baru ? null : bidang('Aktif', select(
        [{ value: 'true', label: 'Ya', selected: u.is_active }, { value: 'false', label: 'Tidak', selected: !u.is_active }],
        { name: 'isActive' }
      ), { nama: 'isActive' })),
    el('div', { class: 'form-aksi' },
      el('button', { type: 'button', class: 'btn', onclick: tutup }, 'Batal'),
      el('button', { type: 'submit', class: 'btn btn-utama' }, 'Simpan'))
  );
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = new FormData(form);
    const muatan = { name: d.get('name'), email: d.get('email'), role: d.get('role') };
    if (d.get('password')) muatan.password = d.get('password');
    if (!baru) muatan.isActive = d.get('isActive') === 'true';
    try {
      if (baru) await api.post('/admin/users', muatan);
      else await api.patch(`/admin/users/${u.id}`, muatan);
      toast('Akun disimpan.', 'sukses'); tutup(); setelahSimpan();
    } catch (err) { tandaiGalat(form, err.details); toastGalat(err); }
  });
}

// ── jejak audit ─────────────────────────────────────────────────────────────
//
// Setiap baris sekarang membawa *apa* yang berubah, bukan cuma bahwa sesuatu
// berubah. Itu perbedaan antara catatan yang bisa dipakai menjawab "siapa yang
// mengubah orbit planet Tim minggu lalu, dan dari berapa?" dan catatan yang
// hanya bisa menjawab "ada yang menyunting menu, entah apa".
const AKSI = {
  create: 'hijau', update: 'biru', delete: 'bahaya', login: 'netral', logout: 'redup',
  reorder: 'ungu', upsert: 'biru', upload: 'netral', change_password: 'perhatian'
};

export async function tampilanAudit(wadah) {
  const keadaan = { limit: 40, offset: 0, entity: '', action: '' };
  const isi = el('div');

  async function muat() {
    pasang(kosongkan(isi), el('p', { class: 'redup' }, 'Memuat…'));
    try {
      const { items, total } = await api.get('/admin/audit', keadaan);
      pasang(kosongkan(isi),
        el('p', { class: 'redup kecil' }, `${total} catatan`),
        tabel(
          [
            {
              judul: 'Waktu',
              lebar: '150px',
              sel: (a) => el('div', {},
                el('span', {}, tanggalID(a.created_at)),
                el('div', { class: 'redup kecil' },
                  new Date(a.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })))
            },
            { judul: 'Aksi', lebar: '110px', sel: (a) => lencana(a.action, AKSI[a.action] ?? 'netral') },
            {
              judul: 'Objek',
              lebar: '190px',
              sel: (a) => el('div', {},
                el('strong', {}, a.entity),
                a.entity_id ? el('div', { class: 'redup kecil' }, String(a.entity_id).slice(0, 24)) : null)
            },
            { judul: 'Perubahan', sel: (a) => daftarPerubahan(a) },
            { judul: 'Pelaku', lebar: '200px', sel: (a) => a.actor_email ?? 'sistem' }
          ],
          items,
          { kosong: 'Belum ada aktivitas.' }),
        navHalaman(total, keadaan, muat));
    } catch (err) { toastGalat(err); }
  }

  pasang(kosongkan(wadah),
    el('div', { class: 'halaman-kepala' },
      el('div', {},
        el('h1', {}, 'Jejak audit'),
        el('p', { class: 'redup' },
          'Setiap perubahan data beserta nilai lama dan barunya. Catatan tidak pernah dihapus, termasuk saat akun pelakunya dihapus.'))),
    el('div', { class: 'saring' },
      select(
        [{ value: '', label: 'Semua objek', selected: true },
         ...['menu', 'article', 'agenda', 'sparing', 'join_submission', 'article_category',
             'sparing_frequency', 'site_setting', 'admin_user', 'media', 'session']
           .map((v) => ({ value: v, label: v }))],
        { onchange: (e) => { keadaan.entity = e.target.value; keadaan.offset = 0; muat(); } }),
      select(
        [{ value: '', label: 'Semua aksi', selected: true },
         ...Object.keys(AKSI).map((v) => ({ value: v, label: v }))],
        { onchange: (e) => { keadaan.action = e.target.value; keadaan.offset = 0; muat(); } })),
    isi);
  await muat();
}

function daftarPerubahan(a) {
  const c = a.changes ?? {};
  const kunci = Object.keys(c);
  if (!kunci.length) {
    const meta = a.meta && Object.keys(a.meta).length
      ? Object.entries(a.meta).map(([k, v]) => `${k}: ${v}`).join(' · ')
      : null;
    return el('span', { class: 'redup kecil' }, meta ?? '—');
  }
  return el('div', { class: 'ubah-daftar' },
    kunci.slice(0, 4).map((k) => el('div', { class: 'ubah' },
      el('span', { class: 'ubah-medan' }, k),
      el('span', { class: 'ubah-dari' }, ringkasNilai(c[k].dari)),
      el('span', { class: 'ubah-panah' }, '→'),
      el('span', { class: 'ubah-jadi' }, ringkasNilai(c[k].jadi)))),
    kunci.length > 4 ? el('span', { class: 'redup kecil' }, `+${kunci.length - 4} medan lain`) : null);
}

const ringkasNilai = (v) => {
  if (v === null || v === undefined) return '∅';
  const s = String(v);
  return s.length > 42 ? `${s.slice(0, 42)}…` : s;
};

function navHalaman(total, keadaan, muat) {
  if (total <= keadaan.limit) return null;
  const sampai = Math.min(keadaan.offset + keadaan.limit, total);
  return el('div', { class: 'halaman-nav' },
    el('span', { class: 'redup kecil' }, `${keadaan.offset + 1}–${sampai} dari ${total}`),
    el('button', {
      class: 'btn btn-kecil', disabled: keadaan.offset === 0,
      onclick: () => { keadaan.offset = Math.max(0, keadaan.offset - keadaan.limit); muat(); }
    }, '‹ Sebelumnya'),
    el('button', {
      class: 'btn btn-kecil', disabled: sampai >= total,
      onclick: () => { keadaan.offset += keadaan.limit; muat(); }
    }, 'Berikutnya ›'));
}

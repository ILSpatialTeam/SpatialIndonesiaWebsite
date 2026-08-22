import { api } from '../api.js';
import {
  el, pasang, kosongkan, toast, toastGalat, drawer, bidang, input, textarea, select, lencana, tandaiGalat
} from '../ui.js';

// Pengelolaan tujuh menu.
//
// Isi panel dan parameter orbit disunting di formulir yang sama karena
// keduanya adalah satu benda: mengubah "Program" berarti mengubah teks
// panelnya sekaligus planet yang mewakilinya. Memisahkannya jadi dua halaman
// akan menyembunyikan hubungan itu.

export async function tampilanMenu(wadah) {
  const isi = el('div');

  async function muat() {
    pasang(kosongkan(isi), el('p', { class: 'redup' }, 'Memuat…'));
    try {
      const menus = await api.get('/admin/menus');
      pasang(kosongkan(isi),
        el('div', { class: 'kartu-kisi' }, menus.map((m) => kartuMenu(m, menus, muat)))
      );
    } catch (err) {
      pasang(kosongkan(isi), el('p', { class: 'galat' }, err.message));
    }
  }

  pasang(kosongkan(wadah),
    el('div', { class: 'halaman-kepala' },
      el('div', {},
        el('h1', {}, 'Menu tata surya'),
        el('p', { class: 'redup' }, 'Tujuh menu: satu inti (matahari) dan enam planet.'))),
    isi
  );
  await muat();
}

// Kartu menu.
//
// Versi pertama menumpahkan seluruh isi baris database ke layar: orbit,
// ukuran, laju, kemiringan, jumlah butir — lima angka telanjang berjajar tanpa
// menjelaskan apa pun. Angka `0.085` tidak berarti apa-apa bagi orang yang
// sedang menyunting teks panel.
//
// Sekarang kartunya menjawab tiga pertanyaan berbeda dengan tiga cara berbeda:
//
//   "Planet yang mana?"   → gambar orbitnya, bukan angkanya. Posisi dan ukuran
//                           lingkaran memakai nilai asli dari database, jadi
//                           kartunya adalah pratinjau, bukan ilustrasi.
//   "Isinya apa?"         → judul, lead, dan cuplikan butir pertama.
//   "Sehat tidak?"        → satu baris keterangan yang menerjemahkan angka jadi
//                           kalimat ("mengorbit paling cepat", "6 butir").
//
// Angka mentahnya tetap ada — di formulir sunting, tempat ia memang dibutuhkan.

const hex = (int) => `#${Number(int ?? 0).toString(16).padStart(6, '0')}`;

// Orbit terjauh dipakai sebagai skala supaya semua kartu memakai perbandingan
// yang sama; kalau tiap kartu menormalkan dirinya sendiri, planet terdalam dan
// terluar akan tampak sama jauhnya.
function pratinjauOrbit(m, orbitMaks) {
  if (m.kind !== 'planet') {
    return el('div', { class: 'orb-pratinjau orb-inti' },
      el('span', { class: 'orb-matahari', style: { '--w': m.accent } }));
  }
  const rasio = Math.min(1, Number(m.orbit) / orbitMaks);
  // 26%–92% dari lebar kartu: planet terdalam tetap terlihat lepas dari
  // matahari, terluar tidak menyentuh tepi.
  const jarak = 26 + rasio * 66;
  const besar = 7 + Math.min(1, Number(m.size) / 1.6) * 9;
  return el('div', { class: 'orb-pratinjau' },
    el('span', { class: 'orb-matahari orb-kecil' }),
    el('span', { class: 'orb-lintasan', style: { width: `${jarak}%` } }),
    el('span', {
      class: m.hasRing ? 'orb-planet orb-bercincin' : 'orb-planet',
      style: { left: `${jarak}%`, width: `${besar}px`, height: `${besar}px`, '--w': hex(m.color) }
    }));
}

// Angka orbit diterjemahkan jadi kalimat. "speed 0.085" tidak memberi tahu
// apa-apa; "paling cepat mengorbit" langsung dimengerti.
function keteranganOrbit(m, semua) {
  if (m.kind !== 'planet') return 'Matahari — pusat tata surya, tanpa orbit.';
  const planet = semua.filter((x) => x.kind === 'planet');
  const urutJarak = [...planet].sort((a, b) => a.orbit - b.orbit);
  const urutLaju = [...planet].sort((a, b) => b.speed - a.speed);
  const bagian = [];
  if (urutJarak[0]?.id === m.id) bagian.push('paling dekat matahari');
  else if (urutJarak[urutJarak.length - 1]?.id === m.id) bagian.push('paling jauh');
  else bagian.push(`urutan ke-${urutJarak.findIndex((x) => x.id === m.id) + 1} dari matahari`);
  if (urutLaju[0]?.id === m.id) bagian.push('mengorbit paling cepat');
  if (m.hasRing) bagian.push('bercincin');
  return `${bagian.join(', ')}.`;
}

function kartuMenu(m, semua, muat) {
  const orbitMaks = Math.max(...semua.filter((x) => x.kind === 'planet').map((x) => Number(x.orbit) || 1), 1);
  const butir = m.items ?? [];
  const dinamis = m.id === 'event' || m.id === 'insight';

  return el(
    'article',
    { class: `kartu kartu-menu${m.isActive ? '' : ' kartu-mati'}`, style: { '--w': m.accent } },

    el('div', { class: 'kartu-atas' },
      el('div', { class: 'kartu-identitas' },
        el('span', { class: 'kartu-no' }, m.no),
        el('div', {},
          el('h3', {}, m.label),
          el('span', { class: 'redup kecil' }, m.kind === 'core' ? 'Inti' : `Planet · ${m.skin ?? '—'}`))),
      m.isActive ? null : lencana('disembunyikan', 'redup')),

    pratinjauOrbit(m, orbitMaks),
    el('p', { class: 'kartu-orbit-teks redup kecil' }, keteranganOrbit(m, semua)),

    el('div', { class: 'kartu-isi' },
      el('p', { class: 'kartu-judul' }, m.title),
      el('p', { class: 'kartu-lead redup' }, m.lead)),

    // Isi panel diringkas jadi satu baris, bukan daftar penuh. Kartu ini untuk
    // mengenali menu, bukan membacanya — bacanya di formulir sunting.
    el('div', { class: 'kartu-butir' },
      dinamis
        ? el('span', { class: 'redup kecil' },
            m.id === 'event' ? 'Isi panel dirakit dari agenda' : 'Isi panel dirakit dari daftar artikel')
        : butir.length
          ? el('span', { class: 'redup kecil' },
              `${butir.length} butir · ${butir.slice(0, 2).map((b) => b.k || b.t).filter(Boolean).join(', ')}${butir.length > 2 ? '…' : ''}`)
          : el('span', { class: 'redup kecil' }, 'Belum ada butir'),
      m.links?.length ? el('span', { class: 'redup kecil' }, `${m.links.length} tautan`) : null),

    el('div', { class: 'kartu-aksi' },
      el('button', { class: 'btn btn-kecil btn-utama', onclick: () => bukaMenu(m, muat) }, 'Sunting'),
      el('button', {
        class: 'btn btn-kecil',
        title: m.isActive ? 'Sembunyikan dari situs' : 'Tampilkan di situs',
        onclick: async () => {
          try {
            await api.patch(`/admin/menus/${m.id}`, { isActive: !m.isActive });
            toast(m.isActive ? 'Menu disembunyikan.' : 'Menu ditampilkan.', 'sukses');
            muat();
          } catch (err) { toastGalat(err); }
        }
      }, m.isActive ? 'Sembunyikan' : 'Tampilkan'))
  );
}

function bukaMenu(m, setelahSimpan) {
  const form = el('form', { class: 'form' });
  const { tutup } = drawer(`Menu: ${m.label}`, form, { lebar: 'min(760px, 94vw)' });

  // Butir panel disunting sebagai daftar yang bisa ditambah dan dikurangi,
  // lalu dikirim utuh. Server mengganti seluruh isinya — tidak ada diff per
  // baris yang perlu dibuat benar di sisi klien.
  const daftarButir = el('div', { class: 'butir-daftar' });
  const tambahButir = (b = { k: '', t: '', d: '' }) => {
    const baris = el(
      'div',
      { class: 'butir' },
      input({ class: 'kendali kendali-kecil', placeholder: 'Label', value: b.k ?? '', dataset: { f: 'k' } }),
      input({ class: 'kendali kendali-kecil', placeholder: 'Judul (opsional)', value: b.t ?? '', dataset: { f: 't' } }),
      textarea({ class: 'kendali kendali-kecil', placeholder: 'Deskripsi', rows: 2, value: b.d ?? '', dataset: { f: 'd' } }),
      el('button', { type: 'button', class: 'btn-ikon', title: 'Hapus butir', onclick: () => baris.remove() }, '×')
    );
    daftarButir.append(baris);
  };
  m.items.forEach(tambahButir);

  const daftarTautan = el('div', { class: 'butir-daftar' });
  const tambahTautan = (l = { label: '', url: '' }) => {
    const baris = el(
      'div',
      { class: 'butir butir-2' },
      input({ class: 'kendali kendali-kecil', placeholder: 'Label', value: l.label ?? '', dataset: { f: 'label' } }),
      input({ class: 'kendali kendali-kecil', placeholder: 'https://…', value: l.url ?? '', dataset: { f: 'url' } }),
      el('button', { type: 'button', class: 'btn-ikon', title: 'Hapus tautan', onclick: () => baris.remove() }, '×')
    );
    daftarTautan.append(baris);
  };
  m.links.forEach(tambahTautan);

  const planetBidang = el(
    'fieldset',
    { class: 'kotak' },
    el('legend', {}, 'Parameter orbit'),
    el('p', { class: 'redup kecil' },
      'Angka-angka ini langsung menggerakkan planetnya di layar. Orbit yang terlalu ' +
      'berdekatan akan ditolak supaya lintasannya tidak bersilangan.'),
    el('div', { class: 'baris-3' },
      bidang('Orbit', input({ name: 'orbit', type: 'number', step: '0.5', value: m.orbit ?? '' }), { nama: 'orbit' }),
      bidang('Ukuran', input({ name: 'size', type: 'number', step: '0.01', value: m.size ?? '' }), { nama: 'size' }),
      bidang('Laju', input({ name: 'speed', type: 'number', step: '0.001', value: m.speed ?? '' }), { nama: 'speed' })),
    el('div', { class: 'baris-3' },
      bidang('Fase', input({ name: 'phase', type: 'number', step: '0.1', value: m.phase ?? '' }), { nama: 'phase' }),
      bidang('Kemiringan', input({ name: 'tilt', type: 'number', step: '0.01', value: m.tilt ?? '' }), { nama: 'tilt' }),
      bidang('Tekstur', input({ name: 'skin', value: m.skin ?? '', placeholder: 'earth' }),
        { nama: 'skin', petunjuk: 'assets/planets/<nama>.jpg' })),
    el('div', { class: 'baris-2' },
      bidang('Warna (hex)', input({ name: 'colorHex', type: 'color', value: `#${(m.color ?? 0).toString(16).padStart(6, '0')}` }),
        { nama: 'color' }),
      bidang('Bercincin', select(
        [{ value: 'false', label: 'Tidak', selected: !m.hasRing }, { value: 'true', label: 'Ya', selected: m.hasRing }],
        { name: 'hasRing' }
      ), { nama: 'hasRing' }))
  );
  planetBidang.hidden = m.kind !== 'planet';

  pasang(form,
    el('div', { class: 'baris-3' },
      bidang('Label menu', input({ name: 'label', value: m.label, required: true }), { nama: 'label' }),
      bidang('Nomor', input({ name: 'no', value: m.no, required: true, maxLength: 6 }), { nama: 'no' }),
      bidang('Tag', input({ name: 'tag', value: m.tag, required: true }), { nama: 'tag' })),
    el('div', { class: 'baris-2' },
      bidang('Warna aksen', input({ name: 'accent', type: 'color', value: m.accent }), { nama: 'accent' }),
      bidang('Ditampilkan', select(
        [{ value: 'true', label: 'Ya', selected: m.isActive }, { value: 'false', label: 'Tidak', selected: !m.isActive }],
        { name: 'isActive' }
      ), { nama: 'isActive' })),
    bidang('Judul panel', input({ name: 'title', value: m.title, required: true }), { nama: 'title' }),
    bidang('Lead panel', textarea({ name: 'lead', value: m.lead, rows: 2 }), { nama: 'lead' }),
    el('fieldset', { class: 'kotak' },
      el('legend', {}, 'Butir panel'),
      m.id === 'event' || m.id === 'insight'
        ? el('p', { class: 'redup kecil' },
            'Panel ini isinya dirakit otomatis dari ' +
            (m.id === 'event' ? 'agenda' : 'daftar artikel') + ' — butir manual di bawah tidak ditampilkan.')
        : null,
      daftarButir,
      el('button', { type: 'button', class: 'btn btn-kecil', onclick: () => tambahButir() }, '+ Tambah butir')),
    el('fieldset', { class: 'kotak' },
      el('legend', {}, 'Tautan'),
      daftarTautan,
      el('button', { type: 'button', class: 'btn btn-kecil', onclick: () => tambahTautan() }, '+ Tambah tautan')),
    planetBidang,
    el('div', { class: 'form-aksi' },
      el('button', { type: 'button', class: 'btn', onclick: tutup }, 'Batal'),
      el('button', { type: 'submit', class: 'btn btn-utama' }, 'Simpan perubahan'))
  );

  const kumpulkan = (wadah, medan) =>
    [...wadah.children].map((baris) =>
      Object.fromEntries(medan.map((f) => [f, baris.querySelector(`[data-f="${f}"]`)?.value ?? '']))
    );

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = new FormData(form);
    const muatan = {
      label: d.get('label'), no: d.get('no'), tag: d.get('tag'),
      accent: d.get('accent'), title: d.get('title'), lead: d.get('lead') ?? '',
      isActive: d.get('isActive') === 'true',
      items: kumpulkan(daftarButir, ['k', 't', 'd']).map((b) => ({ ...b, t: b.t || null })),
      links: kumpulkan(daftarTautan, ['label', 'url']).filter((l) => l.label && l.url)
    };

    if (m.kind === 'planet') {
      Object.assign(muatan, {
        orbit: Number(d.get('orbit')),
        size: Number(d.get('size')),
        speed: Number(d.get('speed')),
        phase: Number(d.get('phase')),
        tilt: Number(d.get('tilt')),
        skin: d.get('skin'),
        hasRing: d.get('hasRing') === 'true',
        // Input warna memberi "#rrggbb"; database menyimpan integer karena itu
        // yang langsung diterima three.js tanpa penguraian ulang.
        color: parseInt(String(d.get('colorHex')).slice(1), 16)
      });
    }

    const tombol = form.querySelector('button[type=submit]');
    tombol.disabled = true;
    try {
      await api.patch(`/admin/menus/${m.id}`, muatan);
      toast('Menu disimpan.', 'sukses');
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

import { api, ApiError } from '../api.js';
import {
  el, pasang, kosongkan, tabel, lencana, toast, toastGalat, konfirmasi, drawer,
  bidang, input, textarea, select, tanggalID, tandaiGalat
} from '../ui.js';

// Daftar dan editor artikel Insight.
//
// Bagian paling menentukan di berkas ini adalah pilihan `source`: artikel bisa
// dibaca di situs ini atau hanya melempar ke Medium. Formulirnya berubah
// mengikuti pilihan itu — memperlihatkan editor untuk yang satu, kolom tautan
// untuk yang lain — supaya penulisnya tidak pernah mengisi dua-duanya lalu
// bertanya-tanya mana yang menang.

const STATUS = { draft: 'netral', published: 'hijau', archived: 'redup' };

export async function tampilanArtikel(wadah) {
  const keadaan = { status: '', category: '', search: '', offset: 0, limit: 20 };
  const isi = el('div');

  let jeda;
  const tundaMuat = () => { clearTimeout(jeda); jeda = setTimeout(muat, 250); };

  const cariEl = input({
    type: 'search', placeholder: 'Cari judul atau slug…',
    oninput: (e) => { keadaan.search = e.target.value; keadaan.offset = 0; tundaMuat(); }
  });

  const { categories } = await api.get('/admin/taxonomy');

  const kepala = el(
    'div',
    { class: 'halaman-kepala' },
    el('div', {}, el('h1', {}, 'Artikel'), el('p', { class: 'redup' }, 'Tulisan yang mengorbit planet Insight.')),
    el('button', { class: 'btn btn-utama', onclick: () => bukaEditor(null, categories, muat) }, '+ Tulis artikel')
  );

  const saring = el(
    'div',
    { class: 'saring' },
    cariEl,
    select(
      [{ value: '', label: 'Semua status' }, ...Object.keys(STATUS).map((s) => ({ value: s, label: s }))],
      { onchange: (e) => { keadaan.status = e.target.value; keadaan.offset = 0; muat(); } }
    ),
    select(
      [{ value: '', label: 'Semua kategori' }, ...categories.map((c) => ({ value: c.id, label: c.label }))],
      { onchange: (e) => { keadaan.category = e.target.value; keadaan.offset = 0; muat(); } }
    )
  );

  async function muat() {
    pasang(kosongkan(isi), el('p', { class: 'redup' }, 'Memuat…'));
    try {
      const { items, total } = await api.get('/admin/articles', keadaan);
      pasang(kosongkan(isi),
        tabel(
          [
            { judul: 'No', lebar: '52px', sel: (a) => a.no },
            {
              judul: 'Judul',
              sel: (a) =>
                el('div', {},
                  el('strong', {}, a.title),
                  el('div', { class: 'redup kecil' }, `/${a.slug}`))
            },
            { judul: 'Kategori', lebar: '110px', sel: (a) => a.categoryId },
            {
              judul: 'Sumber',
              lebar: '110px',
              sel: (a) =>
                a.source === 'medium'
                  ? el('a', { href: a.externalUrl, target: '_blank', rel: 'noopener noreferrer', class: 'tautan' }, 'Medium ↗')
                  : lencana('Di situs', 'biru')
            },
            { judul: 'Status', lebar: '100px', sel: (a) => lencana(a.status, STATUS[a.status]) },
            { judul: 'Terbit', lebar: '110px', sel: (a) => tanggalID(a.publishedAt) },
            { judul: 'Dibaca', lebar: '70px', sel: (a) => String(a.viewCount) },
            {
              judul: '',
              lebar: '178px',
              sel: (a) =>
                el('div', { class: 'aksi-baris' },
                  el('button', { class: 'btn btn-kecil', onclick: () => bukaEditor(a, categories, muat) }, 'Sunting'),
                  el('button', {
                    class: 'btn btn-kecil btn-bahaya',
                    onclick: async () => {
                      if (!(await konfirmasi(`Hapus artikel "${a.title}"? Semua sparing-nya ikut terhapus.`))) return;
                      try {
                        await api.del(`/admin/articles/${a.id}`);
                        toast('Artikel dihapus.', 'sukses');
                        muat();
                      } catch (err) { toastGalat(err); }
                    }
                  }, 'Hapus'))
            }
          ],
          items,
          { kosong: 'Belum ada artikel yang cocok.' }
        ),
        halaman(total, keadaan, muat)
      );
    } catch (err) {
      pasang(kosongkan(isi), el('p', { class: 'galat' }, err.message));
    }
  }

  pasang(kosongkan(wadah), kepala, saring, isi);
  await muat();
}

function halaman(total, keadaan, muat) {
  if (total <= keadaan.limit) return el('p', { class: 'redup kecil' }, `${total} artikel`);
  const dari = keadaan.offset + 1;
  const sampai = Math.min(keadaan.offset + keadaan.limit, total);
  return el(
    'div',
    { class: 'halaman-nav' },
    el('span', { class: 'redup kecil' }, `${dari}–${sampai} dari ${total}`),
    el('button', {
      class: 'btn btn-kecil', disabled: keadaan.offset === 0,
      onclick: () => { keadaan.offset = Math.max(0, keadaan.offset - keadaan.limit); muat(); }
    }, '‹ Sebelumnya'),
    el('button', {
      class: 'btn btn-kecil', disabled: sampai >= total,
      onclick: () => { keadaan.offset += keadaan.limit; muat(); }
    }, 'Berikutnya ›')
  );
}

// ── editor ──────────────────────────────────────────────────────────────────
function bukaEditor(artikel, categories, setelahSimpan) {
  const baru = !artikel;
  const form = el('form', { class: 'form' });
  const { tutup, akar, setPenjaga } = drawer(baru ? 'Tulis artikel' : `Sunting: ${artikel.title}`, form, { lebar: 'min(860px, 94vw)' });
  const jejakEl = el('span', { class: 'editor-jejak bersih' }, 'Tersimpan');

  const nilai = artikel ?? {
    title: '', slug: '', no: '', categoryId: categories[0]?.id ?? '', lead: '',
    author: 'Tim Spatial Indonesia', source: 'internal', externalUrl: '', bodyHtml: '', status: 'draft'
  };

  const sumberEl = select(
    [
      { value: 'internal', label: 'Dibaca di situs ini', selected: nilai.source === 'internal' },
      { value: 'medium', label: 'Alihkan ke Medium', selected: nilai.source === 'medium' }
    ],
    { onchange: (e) => setSumber(e.target.value) }
  );

  const tautanBidang = bidang('Tautan Medium', input({
    name: 'externalUrl', type: 'url', value: nilai.externalUrl ?? '',
    placeholder: 'https://medium.com/@penulis/judul-tulisan'
  }), { nama: 'externalUrl', petunjuk: 'Bulan artikel ini akan membuka tab baru, bukan pembaca di dalam situs.' });

  const editorEl = el('div', { class: 'editor' });
  const editorBidang = el(
    'div',
    { class: 'bidang', dataset: { bidang: 'bodyHtml' } },
    el('span', { class: 'bidang-label' }, 'Isi tulisan'),
    editorEl,
    el('small', { class: 'bidang-petunjuk' },
      'Disimpan sebagai HTML dan dibersihkan di server: skrip, iframe, dan atribut kejadian dibuang.')
  );

  const setSumber = (s) => {
    tautanBidang.hidden = s !== 'medium';
    editorBidang.hidden = s === 'medium';
  };

  const statusEl = select(
    ['draft', 'published', 'archived'].map((s) => ({ value: s, label: s, selected: nilai.status === s })),
    { name: 'status' }
  );

  pasang(form,
    bidang('Judul', input({ name: 'title', value: nilai.title, required: true, maxLength: 200 }), { nama: 'title' }),
    el('div', { class: 'baris-2' },
      bidang('Slug', input({ name: 'slug', value: nilai.slug, placeholder: baru ? 'dibuat otomatis dari judul' : '' }),
        { nama: 'slug', petunjuk: 'Bagian URL. Mengubahnya memutus tautan lama.' }),
      bidang('Nomor arsip', input({ name: 'no', value: nilai.no, placeholder: baru ? 'otomatis' : '', maxLength: 10 }),
        { nama: 'no' })),
    el('div', { class: 'baris-2' },
      bidang('Kategori', select(
        categories.map((c) => ({ value: c.id, label: c.label, selected: c.id === nilai.categoryId })),
        { name: 'categoryId' }
      ), { nama: 'categoryId' }),
      bidang('Penulis', input({ name: 'author', value: nilai.author, maxLength: 120 }), { nama: 'author' })),
    bidang('Lead', textarea({ name: 'lead', value: nilai.lead, maxLength: 400, rows: 2 }),
      { nama: 'lead', petunjuk: 'Kalimat di kartu artikel. Kosongkan untuk diambil dari paragraf pertama.' }),
    el('div', { class: 'baris-2' },
      bidang('Jenis', sumberEl, { nama: 'source' }),
      bidang('Status', statusEl, { nama: 'status' })),
    tautanBidang,
    editorBidang,
    el('div', { class: 'form-aksi' },
      jejakEl,
      el('button', { type: 'button', class: 'btn', onclick: () => tutup() }, 'Batal'),
      el('button', { type: 'submit', class: 'btn btn-utama', title: 'Cmd/Ctrl + S' },
        baru ? 'Simpan artikel' : 'Simpan perubahan'))
  );

  setSumber(nilai.source);

  // Quill dimuat dari berkas lokal (/admin/vendor/quill), bukan CDN — supaya
  // CSP tidak perlu mengizinkan satu pun host luar.
  const quill = new window.Quill(editorEl, {
    theme: 'snow',
    placeholder: 'Tulis di sini…',
    modules: {
      toolbar: {
        container: [
          [{ header: [2, 3, 4, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          ['blockquote', 'code-block'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['link', 'image'],
          ['clean']
        ],
        // Penanganan gambar diambil alih.
        //
        // Bawaan Quill menyisipkan berkas sebagai data URI base64. Sanitizer
        // server hanya mengizinkan skema http/https — dengan alasan yang benar,
        // `data:` adalah vektor XSS — jadi gambarnya dibuang saat disimpan dan
        // penulis mendapat kotak kosong TANPA satu pun peringatan. Berkasnya
        // sekarang benar-benar diunggah ke /admin/media dan yang disisipkan
        // adalah URL-nya.
        handlers: { image: () => unggahGambar(quill) }
      }
    }
  });
  if (nilai.bodyHtml) quill.clipboard.dangerouslyPasteHTML(nilai.bodyHtml);

  // ── perlindungan tulisan ────────────────────────────────────────────────
  //
  // Menulis artikel bisa memakan satu jam. Sebelum ini, satu klik di luar
  // panel menghapus semuanya tanpa bertanya — kegagalan terburuk yang mungkin
  // terjadi pada alat menulis. Tiga lapis sekarang: draf disimpan otomatis ke
  // peramban, penutupan panel bertanya dulu, dan Cmd+S menyimpan tanpa
  // memindahkan tangan dari papan tik.
  const kunciDraf = `si.draf.${artikel?.id ?? 'baru'}`;
  let tersimpan = true;
  let jedaDraf;

  const kumpulkan = () => {
    const d = new FormData(form);
    return {
      title: d.get('title'), slug: d.get('slug'), no: d.get('no'),
      categoryId: d.get('categoryId'), author: d.get('author'), lead: d.get('lead'),
      source: sumberEl.value, status: statusEl.value,
      externalUrl: d.get('externalUrl'),
      bodyHtml: quill.getSemanticHTML(),
      at: Date.now()
    };
  };

  const simpanDraf = () => {
    try { localStorage.setItem(kunciDraf, JSON.stringify(kumpulkan())); }
    catch { /* kuota penuh — draf memang boleh gagal */ }
  };
  const buangDraf = () => { try { localStorage.removeItem(kunciDraf); } catch { /* abaikan */ } };

  const tandaiKotor = () => {
    tersimpan = false;
    jejakEl.textContent = 'Belum tersimpan';
    jejakEl.className = 'editor-jejak kotor';
    clearTimeout(jedaDraf);
    jedaDraf = setTimeout(() => {
      simpanDraf();
      if (!tersimpan) {
        jejakEl.textContent = `Draf disimpan di peramban · ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
      }
    }, 1500);
  };

  form.addEventListener('input', tandaiKotor);
  form.addEventListener('change', tandaiKotor);
  quill.on('text-change', (_d, _o, sumberUbah) => { if (sumberUbah === 'user') tandaiKotor(); });

  // Draf yang tertinggal dari sesi sebelumnya ditawarkan, tidak dipaksakan —
  // memulihkannya diam-diam akan menimpa suntingan yang mungkin sudah benar.
  try {
    const draf = JSON.parse(localStorage.getItem(kunciDraf) || 'null');
    if (draf && (!artikel || draf.bodyHtml !== nilai.bodyHtml)) {
      const umur = Math.round((Date.now() - draf.at) / 60000);
      pasang(form.querySelector('.form-aksi').parentElement.insertBefore(
        el('div', { class: 'draf-pulih' }), form.firstChild),
        el('span', {}, `Ada draf yang belum tersimpan dari ${umur < 1 ? 'kurang dari semenit' : umur + ' menit'} lalu.`),
        el('button', {
          type: 'button', class: 'btn btn-kecil',
          onclick: (ev) => {
            for (const [k, v] of Object.entries(draf)) {
              const kendali = form.querySelector(`[name="${k}"]`);
              if (kendali && v != null) kendali.value = v;
            }
            if (draf.bodyHtml) {
              quill.setContents([]);
              quill.clipboard.dangerouslyPasteHTML(draf.bodyHtml);
            }
            setSumber(draf.source);
            ev.target.closest('.draf-pulih').remove();
            toast('Draf dipulihkan.', 'sukses');
          }
        }, 'Pulihkan'),
        el('button', {
          type: 'button', class: 'btn btn-kecil',
          onclick: (ev) => { buangDraf(); ev.target.closest('.draf-pulih').remove(); }
        }, 'Buang'));
    }
  } catch { /* draf rusak diabaikan */ }

  // Menutup panel dengan perubahan yang belum tersimpan harus bertanya dulu.
  // Penjaga ini berlaku untuk semua jalan keluar sekaligus: tombol ×, tombol
  // Batal, klik di luar panel, dan tombol Esc.
  setPenjaga(async () => {
    if (tersimpan) { buangDraf(); return true; }
    const lanjut = await konfirmasi(
      'Ada perubahan yang belum tersimpan. Draf tetap tersimpan di peramban dan bisa dipulihkan nanti.',
      { tombol: 'Tutup tanpa menyimpan', bahaya: true }
    );
    if (lanjut) simpanDraf();
    return lanjut;
  });

  // Cmd/Ctrl+S menyimpan. Refleks yang sudah terpasang di jari semua orang
  // yang pernah menulis apa pun di komputer.
  const pintasan = (ev) => {
    if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === 's') {
      ev.preventDefault();
      form.requestSubmit();
    }
  };
  document.addEventListener('keydown', pintasan);

  // Menutup tab dengan tulisan yang belum tersimpan memicu dialog bawaan.
  const sebelumTutup = (ev) => { if (!tersimpan) { simpanDraf(); ev.preventDefault(); ev.returnValue = ''; } };
  addEventListener('beforeunload', sebelumTutup);

  // Pendengar global dilepas saat panel hilang; tanpa ini ia menumpuk setiap
  // kali editor dibuka dan Cmd+S akan menyimpan artikel yang salah.
  new MutationObserver((_r, obs) => {
    if (!document.body.contains(akar)) {
      document.removeEventListener('keydown', pintasan);
      removeEventListener('beforeunload', sebelumTutup);
      clearTimeout(jedaDraf);
      obs.disconnect();
    }
  }).observe(document.body, { childList: true });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = new FormData(form);
    const source = sumberEl.value;
    const muatan = {
      title: d.get('title'),
      categoryId: d.get('categoryId'),
      author: d.get('author') || undefined,
      lead: d.get('lead') || undefined,
      status: statusEl.value,
      source,
      // Field kosong dikirim `undefined`, bukan string kosong: string kosong
      // berarti "kosongkan", undefined berarti "biarkan apa adanya" — untuk
      // slug, keduanya sangat berbeda.
      slug: d.get('slug') || undefined,
      no: d.get('no') || undefined,
      externalUrl: source === 'medium' ? d.get('externalUrl') : null,
      bodyHtml: source === 'internal' ? quill.getSemanticHTML() : ''
    };

    const tombol = form.querySelector('button[type=submit]');
    tombol.disabled = true;
    try {
      if (baru) await api.post('/admin/articles', muatan);
      else await api.patch(`/admin/articles/${artikel.id}`, muatan);
      tersimpan = true;
      buangDraf();
      jejakEl.textContent = 'Tersimpan';
      jejakEl.className = 'editor-jejak bersih';
      toast(baru ? 'Artikel dibuat.' : 'Perubahan disimpan.', 'sukses');
      tutup({ paksa: true });
      setelahSimpan();
    } catch (err) {
      tandaiGalat(form, err.details);
      toastGalat(err);
    } finally {
      tombol.disabled = false;
    }
  });
}

// Membuka pemilih berkas, mengunggahnya ke /admin/media, lalu menyisipkan URL
// hasilnya ke posisi kursor. Berkasnya tersimpan di server — bukan tertanam
// sebagai base64 di dalam kolom body_html, yang akan membuat satu artikel
// berisi tiga gambar berukuran megabita.
function unggahGambar(quill) {
  const pilih = document.createElement('input');
  pilih.type = 'file';
  pilih.accept = 'image/jpeg,image/png,image/webp,image/gif,image/avif';
  pilih.onchange = async () => {
    const berkas = pilih.files?.[0];
    if (!berkas) return;
    // Batas server 4 MB. Diperiksa di sini juga supaya penolakannya instan,
    // bukan setelah menunggu unggahan yang pasti gagal.
    if (berkas.size > 4 * 1024 * 1024) {
      toast('Gambar maksimal 4 MB.', 'galat');
      return;
    }
    const posisi = quill.getSelection(true)?.index ?? quill.getLength();
    toast('Mengunggah gambar…');
    try {
      const fd = new FormData();
      fd.append('file', berkas);
      const hasil = await api.upload('/admin/media', fd);
      quill.insertEmbed(posisi, 'image', hasil.url, 'user');
      quill.setSelection(posisi + 1, 0);
    } catch (err) {
      toastGalat(err instanceof ApiError ? err : new ApiError(0, { error: { message: 'Unggahan gagal.' } }));
    }
  };
  pilih.click();
}

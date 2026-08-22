import { api } from '../api.js';
import { el, pasang, kosongkan, tabel, lencana, tanggalID, select, ikon, toastGalat } from '../ui.js';

// Halaman pemantauan: keamanan, kesehatan database, dan jejak perubahan.
//
// Yang membedakannya dari halaman lain: isinya tidak menuntut tindakan
// langsung, ia menuntut *perhatian*. Jadi susunannya dibalik dari kebiasaan —
// penilaian dan hal yang mencurigakan di atas, angka mentah di bawah. Orang
// yang membuka halaman ini biasanya sedang bertanya "ada yang aneh tidak?",
// bukan "berapa persisnya jumlah X".

const WARNA_TINGKAT = { aman: 'hijau', waspada: 'perhatian', kritis: 'bahaya' };
const WARNA_BERAT = { info: 'redup', notice: 'netral', warning: 'perhatian', critical: 'bahaya' };

const LABEL_JENIS = {
  login_failed: 'Login gagal', login_ok: 'Login berhasil', logout: 'Keluar',
  account_locked: 'Akun dikunci', rate_limited: 'Batas laju', csrf_rejected: 'CSRF ditolak',
  cors_rejected: 'Origin ditolak', unauthorized: 'Tanpa sesi', forbidden: 'Akses ditolak',
  validation_failed: 'Data tidak valid', upload_rejected: 'Unggahan ditolak',
  server_error: 'Galat server', not_found: 'Rute tidak ada',
  password_changed: 'Kata sandi diganti', session_revoked: 'Sesi dicabut'
};

const jam = (iso) => new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
const waktu = (iso) => `${tanggalID(iso)} ${jam(iso)}`;

export async function tampilanPemantauan(wadah) {
  const keadaan = { jam: 24 };
  const isi = el('div');

  async function muat() {
    pasang(kosongkan(isi), el('p', { class: 'redup' }, 'Memuat…'));
    try {
      const [m, db] = await Promise.all([
        api.get('/admin/monitor', { jam: keadaan.jam }),
        api.get('/admin/monitor/database')
      ]);
      pasang(kosongkan(isi),
        kartuStatus(m),
        kotakAngka(m),
        el('div', { class: 'pantau-kolom' },
          grafik(m.deret),
          sumberPanel(m.sumberTeratas)),
        kejadianPanel(m.terbaru),
        databasePanel(db),
        tabelPanel(db.tabel),
        indeksPanel(db.indeks, db.kueriLambat));
    } catch (err) {
      pasang(kosongkan(isi), el('p', { class: 'galat' },
        err.status === 403
          ? 'Halaman pemantauan hanya untuk akun owner.'
          : err.message));
    }
  }

  pasang(kosongkan(wadah),
    el('div', { class: 'halaman-kepala' },
      el('div', {},
        el('h1', {}, 'Pemantauan'),
        el('p', { class: 'redup' },
          'Keamanan, kesehatan database, dan setiap perubahan data — dalam satu layar.')),
      select(
        [
          { value: '24', label: '24 jam terakhir', selected: true },
          { value: '168', label: '7 hari terakhir' },
          { value: '720', label: '30 hari terakhir' }
        ],
        { onchange: (e) => { keadaan.jam = Number(e.target.value); muat(); } }
      )),
    isi);
  await muat();
}

// ── penilaian ───────────────────────────────────────────────────────────────
function kartuStatus(m) {
  const t = m.status.tingkat;
  return el('div', { class: `pantau-status pantau-${t}` },
    el('div', { class: 'pantau-status-kiri' },
      el('span', { class: 'pantau-cincin' }, el('span', { class: 'pantau-inti' })),
      el('div', {},
        el('strong', {}, t === 'aman' ? 'Tidak ada indikasi masalah' : t === 'waspada' ? 'Perlu diperiksa' : 'Butuh tindakan sekarang'),
        el('div', { class: 'redup kecil' }, `Berdasarkan ${m.periodeJam} jam terakhir`))),
    el('ul', { class: 'pantau-catatan' },
      m.status.catatan.map((c) => el('li', {}, c))));
}

function kotakAngka(m) {
  const k = m.keamanan;
  const kotak = (label, nilai, catatan, jenis) =>
    el('div', { class: `stat stat-${jenis || 'netral'}` },
      el('span', { class: 'stat-nilai' }, String(nilai)),
      el('span', { class: 'stat-judul' }, label),
      catatan ? el('span', { class: 'stat-catatan' }, catatan) : null);

  return el('div', { class: 'stat-kisi' },
    kotak('Galat server', k.galat_server, k.galat_server ? 'Periksa daftar kejadian' : 'Tidak ada', k.galat_server ? 'perhatian' : 'netral'),
    kotak('Login gagal', k.login_gagal, `${k.sumber_unik} sumber berbeda`, k.login_gagal >= 20 ? 'perhatian' : 'netral'),
    kotak('Kena batas laju', k.dibatasi, k.dibatasi ? 'Permintaan ditahan' : 'Tidak ada', k.dibatasi >= 30 ? 'perhatian' : 'netral'),
    kotak('Total kejadian', k.total, `${k.peringatan} peringatan · ${k.kritis} kritis`));
}

// ── grafik ──────────────────────────────────────────────────────────────────
// Batang murni CSS, bukan pustaka grafik. Satu deret 14 angka tidak sepadan
// dengan menambah dependensi yang harus dijaga dan diperbarui.
function grafik(deret) {
  const maks = Math.max(1, ...deret.map((d) => d.total));
  return el('div', { class: 'panel' },
    el('h2', {}, 'Kejadian per hari'),
    el('div', { class: 'grafik' },
      deret.map((d) => {
        const tinggi = Math.round((d.total / maks) * 100);
        return el('div', {
          class: 'grafik-batang',
          title: `${tanggalID(d.hari)} · ${d.total} kejadian${d.berat ? `, ${d.berat} berat` : ''}`
        },
          el('span', {
            class: d.berat ? 'grafik-isi grafik-berat' : 'grafik-isi',
            // Minimal 3% supaya hari dengan sedikit kejadian tetap terlihat
            // sebagai garis, bukan menghilang jadi nol.
            style: { height: `${d.total ? Math.max(3, tinggi) : 0}%` }
          }));
      })),
    el('div', { class: 'grafik-kaki redup kecil' },
      el('span', {}, tanggalID(deret[0]?.hari)),
      el('span', {}, `puncak ${maks}`),
      el('span', {}, tanggalID(deret[deret.length - 1]?.hari))));
}

function sumberPanel(sumber) {
  return el('div', { class: 'panel' },
    el('h2', {}, 'Sumber paling aktif'),
    el('p', { class: 'redup kecil' },
      'Alamat IP tidak pernah disimpan mentah — yang tercatat hanya sidik ber-garam, cukup untuk mengenali sumber yang sama.'),
    sumber.length
      ? el('ul', { class: 'jejak' },
          sumber.map((s) => el('li', {},
            el('code', {}, s.ip_hash.slice(0, 10)),
            s.berat ? lencana(`${s.berat} berat`, 'perhatian') : null,
            el('span', { class: 'redup kecil' }, (s.jenis || []).map((j) => LABEL_JENIS[j] ?? j).join(', ')),
            el('span', { class: 'redup kecil jejak-kanan' }, `${s.jumlah}× · ${jam(s.terakhir)}`))))
      : el('p', { class: 'redup' }, 'Belum ada kejadian dari sumber mana pun.'));
}

// ── kejadian ────────────────────────────────────────────────────────────────
function kejadianPanel(terbaru) {
  return el('div', { class: 'panel' },
    el('div', { class: 'panel-kepala' },
      el('h2', {}, 'Kejadian terakhir'),
      el('a', { href: '#/kejadian', class: 'btn btn-kecil' }, 'Lihat semua')),
    tabel(
      [
        { judul: 'Waktu', lebar: '150px', sel: (e) => waktu(e.created_at) },
        { judul: 'Tingkat', lebar: '100px', sel: (e) => lencana(e.severity, WARNA_BERAT[e.severity]) },
        { judul: 'Jenis', lebar: '150px', sel: (e) => LABEL_JENIS[e.kind] ?? e.kind },
        { judul: 'Keterangan', sel: (e) => el('div', {},
            el('span', {}, e.message),
            e.path ? el('div', { class: 'redup kecil' }, `${e.method} ${e.path}`) : null) },
        { judul: 'Akun', lebar: '190px', sel: (e) => e.actor_email || '—' }
      ],
      terbaru,
      { kosong: 'Belum ada kejadian tercatat.' }));
}

// ── database ────────────────────────────────────────────────────────────────
function databasePanel(db) {
  const d = db.database;
  const baris = (label, nilai, catatan) =>
    el('div', { class: 'db-baris' },
      el('span', { class: 'redup kecil' }, label),
      el('strong', {}, String(nilai)),
      catatan ? el('span', { class: 'redup kecil' }, catatan) : null);

  return el('div', { class: 'panel' },
    el('div', { class: 'panel-kepala' },
      el('h2', {}, 'Status database'),
      lencana(d.cacheHitRatio >= 95 ? 'sehat' : 'perhatikan', d.cacheHitRatio >= 95 ? 'hijau' : 'perhatian')),
    el('div', { class: 'db-kisi' },
      baris('Versi', d.versi),
      baris('Ukuran', d.ukuran),
      baris('Koneksi', `${d.koneksi} / ${d.koneksiMaks}`, `${d.koneksiPersen}% terpakai`),
      baris('Uptime', `${d.uptimeJam} jam`),
      baris('Rasio cache', d.cacheHitRatio === null ? '—' : `${d.cacheHitRatio}%`,
        d.cacheHitRatio !== null && d.cacheHitRatio < 95 ? 'di bawah 95%' : 'baca dilayani dari memori'),
      baris('Deadlock', d.deadlock, d.deadlock ? 'perlu diperiksa' : 'tidak ada'),
      baris('Transaksi', d.commit.toLocaleString('id-ID'), `${d.rollback} dibatalkan`),
      baris('Baris ditulis', d.tulis.toLocaleString('id-ID'), 'sejak Postgres menyala')));
}

function tabelPanel(daftar) {
  return el('div', { class: 'panel' },
    el('h2', {}, 'Tabel'),
    tabel(
      [
        { judul: 'Tabel', sel: (t) => el('code', {}, t.tabel) },
        { judul: 'Baris', lebar: '90px', sel: (t) => t.baris.toLocaleString('id-ID') },
        { judul: 'Ukuran', lebar: '90px', sel: (t) => t.ukuran },
        {
          judul: 'Baris mati',
          lebar: '160px',
          // Baris mati adalah versi lama yang belum dibersihkan autovacuum.
          // Rasio tinggi berarti tabelnya membengkak tanpa datanya bertambah.
          sel: (t) => t.rasioMati > 50
            ? lencana(`${t.rasioMati}% — perlu vacuum`, 'perhatian')
            : el('span', { class: 'redup' }, t.rasioMati ? `${t.rasioMati}%` : '—')
        },
        { judul: 'Vacuum terakhir', lebar: '150px', sel: (t) => t.last_autovacuum ? waktu(t.last_autovacuum) : '—' }
      ],
      daftar));
}

function indeksPanel(indeks, lambat) {
  const belum = indeks.filter((i) => i.dipakai === 0);
  return el('div', { class: 'panel' },
    el('h2', {}, 'Kueri & indeks'),
    lambat.length
      ? el('div', {},
          el('p', { class: 'galat kecil' }, `${lambat.length} kueri berjalan lebih dari 5 detik:`),
          el('ul', { class: 'jejak' },
            lambat.map((q) => el('li', {},
              lencana(`${q.berjalan_detik}s`, 'perhatian'),
              el('code', {}, q.kueri.slice(0, 90))))))
      : el('p', { class: 'redup kecil' }, 'Tidak ada kueri yang berjalan lama.'),
    belum.length
      ? el('p', { class: 'redup kecil' },
          `${belum.length} indeks belum pernah terpakai (${belum.map((i) => i.indeks).slice(0, 4).join(', ')}${belum.length > 4 ? ', …' : ''}). ` +
          'Wajar untuk indeks yang baru dibuat; kalau bertahan berminggu-minggu, ia hanya menambah ongkos tulis.')
      : null);
}

// ── halaman daftar kejadian penuh ───────────────────────────────────────────
export async function tampilanKejadian(wadah) {
  const keadaan = { limit: 40, offset: 0, kind: '', severity: '' };
  const isi = el('div');

  async function muat() {
    pasang(kosongkan(isi), el('p', { class: 'redup' }, 'Memuat…'));
    try {
      const { items, total } = await api.get('/admin/monitor/events', keadaan);
      pasang(kosongkan(isi),
        el('p', { class: 'redup kecil' }, `${total} kejadian`),
        tabel(
          [
            { judul: 'Waktu', lebar: '150px', sel: (e) => waktu(e.created_at) },
            { judul: 'Tingkat', lebar: '100px', sel: (e) => lencana(e.severity, WARNA_BERAT[e.severity]) },
            { judul: 'Jenis', lebar: '150px', sel: (e) => LABEL_JENIS[e.kind] ?? e.kind },
            {
              judul: 'Keterangan',
              sel: (e) => el('div', {},
                el('span', {}, e.message),
                e.path ? el('div', { class: 'redup kecil' }, `${e.method} ${e.path} → ${e.status ?? '—'}`) : null,
                e.meta && Object.keys(e.meta).length
                  ? el('div', { class: 'redup kecil' }, JSON.stringify(e.meta).slice(0, 160))
                  : null)
            },
            { judul: 'Sumber', lebar: '110px', sel: (e) => e.ip_hash ? el('code', {}, e.ip_hash.slice(0, 8)) : '—' },
            { judul: 'Akun', lebar: '180px', sel: (e) => e.actor_email || '—' }
          ],
          items,
          { kosong: 'Tidak ada kejadian yang cocok.' }),
        halamanNav(total, keadaan, muat));
    } catch (err) { toastGalat(err); }
  }

  pasang(kosongkan(wadah),
    el('div', { class: 'halaman-kepala' },
      el('div', {},
        el('h1', {}, 'Kejadian keamanan'),
        el('p', { class: 'redup' }, 'Setiap penolakan, kegagalan, dan galat yang tercatat sistem.'))),
    el('div', { class: 'saring' },
      select(
        [{ value: '', label: 'Semua tingkat', selected: true },
         { value: 'critical', label: 'Kritis' }, { value: 'warning', label: 'Peringatan' },
         { value: 'notice', label: 'Perhatian' }, { value: 'info', label: 'Info' }],
        { onchange: (e) => { keadaan.severity = e.target.value; keadaan.offset = 0; muat(); } }),
      select(
        [{ value: '', label: 'Semua jenis', selected: true },
         ...Object.entries(LABEL_JENIS).map(([v, l]) => ({ value: v, label: l }))],
        { onchange: (e) => { keadaan.kind = e.target.value; keadaan.offset = 0; muat(); } })),
    isi);
  await muat();
}

function halamanNav(total, keadaan, muat) {
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

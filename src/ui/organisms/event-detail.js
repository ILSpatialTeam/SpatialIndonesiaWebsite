// Organisme: halaman satu acara — uraian lengkap dan pendaftarannya.
//
// Kartu Event menjawab "kapan dan di mana"; berkas ini menjawab "acaranya
// tentang apa, dan bagaimana saya ikut". Dipisah karena keduanya dibaca pada
// saat yang berbeda: daftar dipindai sekilas, detail dibaca satu.
//
// ── Kenapa lapisannya sendiri, bukan di dalam panel Event ───────────────────
//
// Panel Event milik template Design Canvas dan lebarnya 430px — cukup untuk
// daftar, sempit untuk uraian berparagraf plus formulir enam baris. Lebih
// penting lagi, panel itu subtree React: menyuntikkan formulir hidup ke
// dalamnya berarti setiap render ulang bisa menghapus isian yang sedang
// diketik orang. Jadi polanya sama dengan `insight-reader.js` — DOM sendiri,
// dipasang ke `document.body`, di luar pohon React.
//
// ── Kenapa detailnya diambil ulang tiap dibuka ──────────────────────────────
//
// Daftar acara ikut cache /bootstrap yang berumur dua menit. Di daftar itu
// tidak apa-apa; angka "sisa 3 kursi" di sana cuma keterangan. Di halaman ini
// angka yang sama jadi dasar keputusan orang untuk mengisi formulir, dan
// menampilkan yang basi berarti sebagian orang mengisi enam field untuk
// ditolak di langkah terakhir. Satu permintaan per pembukaan jauh lebih murah
// daripada kegagalan itu.
import { el } from '../atoms/el.js';
import { tanggalID as tanggal } from '../../data/panels.js';
import { AGENDA, agendaState } from '../../data/agenda.js';
import { muatAcara, daftarAcara } from '../../data/remote.js';
import { saveIcs } from './hero-board.js';

export const css = `/* -- halaman satu acara: uraian + pendaftaran -- */
.ev-root {
  position: fixed; inset: 0; z-index: 46; display: none;
  align-items: center; justify-content: center; padding: 32px;
  font-family: 'Instrument Sans', system-ui, sans-serif; color: var(--hud-paper);
}

.ev-root.on { display: flex; }

.ev-scrim {
  position: absolute; inset: 0; background: rgba(8,7,12,.72); backdrop-filter: blur(7px);
  opacity: 0; transition: opacity .3s;
}

.ev-root.on .ev-scrim { opacity: 1; }

/* Pil nama planet dan penunjuk kursor melayang di atas kanvas, bukan di dalam
   panel mana pun — jadi keduanya tetap terbaca menembus scrim kalau tidak
   diredupkan, dan "Event" yang menempel di tepi kartu terlihat seperti bagian
   dari kartunya. Pola dan daftar elemennya sama dengan .hud-focus di
   cluster.js dan .pn-read di insight-reader.js. */
html.ev-open [data-planet-label], html.ev-open [data-ui="cursorpick"],
html.ev-open [data-ui="reticle"] {
  opacity: 0 !important; pointer-events: none !important; transition: opacity .3s;
}

.ev-card {
  position: relative; display: flex; flex-direction: column;
  width: min(560px, 100%); max-height: 100%;
  border: 1px solid rgba(243,242,248,.14); border-radius: 12px;
  background: rgba(18,17,22,.94); box-shadow: 0 30px 80px rgba(0,0,0,.5);
  /* Kartunya sendiri yang menggulung, bukan halamannya: kanvas 3D memakai
     touch-action none, dan lapisan yang menutupinya harus menerima gulirannya
     sendiri supaya bisa dibaca di layar sentuh. */
  overflow-y: auto; overscroll-behavior: contain; -webkit-overflow-scrolling: touch;
  opacity: 0; transform: translateY(14px) scale(.985);
  transition: opacity .32s cubic-bezier(.2,.7,.2,1), transform .32s cubic-bezier(.2,.7,.2,1);
}

.ev-root.on .ev-card { opacity: 1; transform: none; }

.ev-head { position: relative; padding: 26px 28px 0; }

.ev-close {
  position: absolute; top: 20px; right: 22px; width: 27px; height: 27px;
  border: 1px solid rgba(243,242,248,.18); border-radius: 50%;
  background: rgba(18,17,22,.6); color: var(--hud-muted);
  font-size: 13px; line-height: 1; cursor: pointer; transition: color .2s, border-color .2s;
}

.ev-close:hover { color: var(--hud-iris); border-color: var(--hud-iris); }

.ev-top { display: flex; align-items: baseline; gap: 11px; padding-right: 34px; }

.ev-kind { font-family: 'Poppins', sans-serif; font-size: 12px; color: var(--hud-iris); }

.ev-when {
  font-family: var(--hud-mono); font-size: 8.5px; letter-spacing: .16em; color: var(--hud-dim);
}

.ev-when.soon { color: var(--hud-mint); }

.ev-title {
  margin: 9px 0 0; font-family: 'Poppins', sans-serif; font-weight: 600;
  font-size: 25px; line-height: 1.12; letter-spacing: -.02em;
}

/* Baris fakta: tanggal, jam, tempat. Grid dua kolom supaya labelnya sejajar
   dan matanya bisa melompat ke nilainya tanpa membaca labelnya lagi. */
.ev-facts {
  display: grid; grid-template-columns: 72px 1fr; gap: 7px 14px;
  margin: 20px 0 0; padding: 16px 0 0; border-top: 1px solid rgba(243,242,248,.1);
  font-size: 13px;
}

.ev-facts dt {
  font-family: var(--hud-mono); font-size: 8.5px; letter-spacing: .16em;
  color: var(--hud-dim); padding-top: 3px;
}

.ev-facts dd { margin: 0; color: var(--hud-paper); line-height: 1.5; }

.ev-facts dd small { display: block; color: var(--hud-muted); font-size: 12px; }

.ev-body { padding: 22px 28px 0; font-size: 13.5px; line-height: 1.68; color: var(--hud-muted); }

.ev-body h3 {
  margin: 20px 0 8px; font-family: 'Poppins', sans-serif; font-weight: 600;
  font-size: 15px; line-height: 1.3; color: var(--hud-paper);
}

.ev-body h3:first-child { margin-top: 0; }

.ev-body p { margin: 0 0 11px; }

.ev-body a { color: var(--hud-iris); }

.ev-body ul, .ev-body ol { margin: 0 0 12px; padding-left: 20px; }

.ev-body li { margin: 0 0 5px; }

.ev-body strong { color: var(--hud-paper); font-weight: 600; }

.ev-body hr { margin: 16px 0; border: 0; border-top: 1px solid rgba(243,242,248,.1); }

.ev-body blockquote {
  margin: 14px 0; padding-left: 14px; border-left: 2px solid rgba(158,148,249,.5);
  color: var(--hud-paper); font-style: italic;
}

/* ── kaki: pendaftaran ── */
.ev-foot { margin-top: 22px; padding: 20px 28px 26px; border-top: 1px solid rgba(243,242,248,.1); }

.ev-seats {
  display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 14px;
  font-family: var(--hud-mono); font-size: 8.5px; letter-spacing: .16em; color: var(--hud-dim);
}

.ev-seats b { color: var(--hud-mint); font-weight: 400; }

.ev-seats.tight b { color: var(--hud-hot); }

/* Batang kuota. Angka saja sudah benar, tapi batang membuat "hampir penuh"
   terbaca sebelum angkanya dibaca — dan itu yang menentukan orang mendaftar
   sekarang atau nanti. */
.ev-bar { height: 3px; border-radius: 2px; background: rgba(243,242,248,.1); overflow: hidden; margin-bottom: 16px; }

.ev-bar i { display: block; height: 100%; border-radius: 2px; background: var(--hud-iris); transition: width .4s; }

.ev-bar.tight i { background: var(--hud-hot); }

.ev-actions { display: flex; flex-wrap: wrap; gap: 9px; }

.ev-btn {
  flex: 1 1 auto; padding: 11px 18px; border: 0; border-radius: 999px;
  background: var(--hud-accent); color: #fff;
  font-family: var(--hud-mono); font-size: 9px; letter-spacing: .18em; text-align: center;
  text-decoration: none; cursor: pointer; transition: background .2s, opacity .2s;
}

.ev-btn:hover { background: #7a68f0; }

.ev-btn[disabled] { background: rgba(243,242,248,.08); color: var(--hud-dim); cursor: not-allowed; }

.ev-btn.ghost {
  flex: 0 0 auto; background: transparent; color: var(--hud-muted);
  box-shadow: inset 0 0 0 1px rgba(243,242,248,.14);
}

.ev-btn.ghost:hover { background: transparent; color: var(--hud-paper); box-shadow: inset 0 0 0 1px rgba(158,148,249,.6); }

.ev-hint { margin: 12px 0 0; font-size: 12px; line-height: 1.55; color: var(--hud-dim); }

/* ── formulir ── */
.ev-form { display: flex; flex-direction: column; gap: 11px; margin-top: 4px; }

.ev-form .row { display: grid; grid-template-columns: 1fr 1fr; gap: 11px; }

.ev-field { display: flex; flex-direction: column; gap: 5px; min-width: 0; }

.ev-field label {
  font-family: var(--hud-mono); font-size: 8.5px; letter-spacing: .16em; color: var(--hud-dim);
}

.ev-field input, .ev-field textarea {
  width: 100%; padding: 10px 12px; border: 1px solid rgba(243,242,248,.14); border-radius: 7px;
  background: rgba(243,242,248,.04); color: var(--hud-paper);
  font-family: inherit; font-size: 13px; line-height: 1.45; resize: vertical;
}

.ev-field input:focus, .ev-field textarea:focus { outline: 0; border-color: var(--hud-iris); }

.ev-field.bad input, .ev-field.bad textarea { border-color: #ff9b9d; }

.ev-field em { font-style: normal; font-size: 11.5px; color: #ff9b9d; }

.ev-err { margin: 0; padding: 10px 12px; border-radius: 7px; background: rgba(255,155,157,.1); color: #ff9b9d; font-size: 12.5px; line-height: 1.5; }

/* Keadaan berhasil menggantikan formulirnya, bukan ditambahkan di bawahnya:
   setelah kursinya didapat, formulir yang masih terpampang mengundang orang
   mendaftar dua kali. */
.ev-done { display: flex; flex-direction: column; gap: 9px; align-items: flex-start; }

.ev-done strong { font-family: 'Poppins', sans-serif; font-size: 16px; font-weight: 600; color: var(--hud-paper); }

.ev-done p { margin: 0; font-size: 12.5px; line-height: 1.6; color: var(--hud-muted); }

.ev-tick {
  display: grid; place-items: center; width: 34px; height: 34px; border-radius: 50%;
  background: rgba(158,148,249,.16); color: var(--hud-iris); font-size: 16px;
}

.ev-load { padding: 40px 28px; text-align: center; font-family: var(--hud-mono); font-size: 9px; letter-spacing: .18em; color: var(--hud-dim); }

@media (max-width: 779px) {
  /* Di ponsel bentuknya lembar penuh yang menempel di bawah, bukan kartu
     melayang: layarnya tidak punya ruang untuk margin di empat sisi, dan
     ibu jari ada di bawah — di situlah tombol daftarnya harus berakhir. */
  .ev-root { padding: 0; align-items: flex-end; }
  .ev-card { width: 100%; max-height: 92vh; border-radius: 14px 14px 0 0; border-bottom: 0; }
  .ev-head { padding: 22px 20px 0; }
  .ev-body { padding: 18px 20px 0; }
  .ev-foot { padding: 18px 20px 24px; }
  .ev-title { font-size: 22px; }
  .ev-form .row { grid-template-columns: 1fr; }
  .ev-actions { flex-direction: column; }
  .ev-btn.ghost { flex: 1 1 auto; }
}`;

const DAY = 86400000;
const stempel = (iso) => {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return Date.UTC(y, m - 1, d, 5, 0, 0);
};

// Hitung mundur yang sama dengan yang dipakai baris kartu Event. Satu fungsi,
// supaya tidak ada acara yang "3 HARI LAGI" di daftar dan "2 HARI LAGI" di
// halamannya.
export function hitungMundur(iso) {
  const sisa = Math.ceil((stempel(iso) - Date.now()) / DAY);
  if (sisa < 0) return { teks: 'DONE', lewat: true, dekat: false };
  if (sisa === 0) return { teks: 'TODAY', lewat: false, dekat: true };
  return { teks: sisa + ' DAYS AWAY', lewat: false, dekat: sisa <= 7 };
}

// Host tautan pendaftaran luar dipakai sebagai nama tombol ("DAFTAR DI
// FORMS.GLE"). Orang perlu tahu ke mana ia akan dibawa sebelum mengetuk —
// tombol "DAFTAR" yang tiba-tiba membuka tab Google Form terasa seperti
// jebakan, sekalipun tidak ada yang salah.
const hostDari = (url) => {
  try { return new URL(url).host.replace(/^www\./, ''); } catch { return 'situs panitia'; }
};

const root = el('div', { class: 'ev-root' });
const scrim = el('div', { class: 'ev-scrim' });
const card = el('div', { class: 'ev-card', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Event detail' });
root.append(scrim, card);
document.body.append(root);

let terbuka = null;          // id acara yang sedang tampil
let pemulih = null;          // fokus yang harus dikembalikan saat ditutup

export function closeEvent() {
  if (!terbuka) return;
  terbuka = null;
  root.classList.remove('on');
  document.documentElement.classList.remove('ev-open');
  // Isinya dibuang setelah animasi keluar selesai, bukan seketika: menghapus
  // saat itu juga membuat kartunya berkedip kosong selama transisi.
  setTimeout(() => { if (!terbuka) card.replaceChildren(); }, 320);
  pemulih?.focus?.();
  pemulih = null;
}

scrim.addEventListener('click', closeEvent);
addEventListener('keydown', (e) => { if (e.key === 'Escape' && terbuka) closeEvent(); });

// ── potongan tampilan ───────────────────────────────────────────────────────

function fakta(ev) {
  const jam = ev.startsAt ? (ev.endsAt ? `${ev.startsAt} – ${ev.endsAt}` : `${ev.startsAt} WIB`) : null;
  const dl = el('dl', { class: 'ev-facts' });
  dl.append(
    el('dt', { text: 'DATE' }),
    el('dd', {}, [document.createTextNode(tanggal(ev.date)), jam ? el('small', { text: jam }) : null].filter(Boolean))
  );
  if (ev.place || ev.address) {
    dl.append(
      el('dt', { text: 'PLACE' }),
      el('dd', {}, [
        document.createTextNode(ev.place || ev.address),
        ev.place && ev.address ? el('small', { text: ev.address }) : null
      ].filter(Boolean))
    );
  }
  return dl;
}

// Uraian dirender apa adanya, TIDAK lewat `htmlKeBlok()`.
//
// Godaannya besar: pembaca artikel sudah punya fungsi itu, dan memakainya
// terasa seperti berbagi kode. Tapi `htmlKeBlok` bukan perapi HTML — ia
// memecah tulisan jadi (bagian, paragraf) supaya sparing bisa ditambatkan ke
// koordinat itu. Bentuknya `{h, p[], q}`: satu kutipan per bagian, dan kutipan
// selalu digambar sebelum paragraf. Untuk artikel itu tidak masalah; untuk
// uraian acara, kutipan penutup melompat ke atas paragraf yang ia tutup, dan
// urutan yang ditulis panitia berubah tanpa ada yang tahu.
//
// Acara tidak punya sparing, jadi tidak ada yang perlu ditambatkan. Yang
// dibutuhkan cuma menampilkan HTML yang sudah dibersihkan.
//
// Soal keamanan: HTML-nya disanitasi di server oleh `sanitizeArticleHtml()`
// sebelum masuk database — kebijakan yang sama dengan artikel, dan sanitasi
// saat simpan memang jalur yang dipilih proyek ini (lihat shared/html.js).
// Menyalurkannya lewat `htmlKeBlok` tidak menambah perlindungan apa pun:
// fungsi itu juga mengeluarkan innerHTML di ujungnya.
function uraian(html) {
  const bersih = String(html ?? '').trim();
  if (!bersih) return null;
  const wadah = el('div', { class: 'ev-body' });
  wadah.innerHTML = bersih;

  // Tautan keluar dikeraskan lagi di klien. Server sudah memasang rel yang
  // benar lewat transformTags, tapi uraian lama yang tersimpan sebelum aturan
  // itu ada tetap ada di database — dan `noopener` yang hilang berarti tab
  // tujuan bisa mengubah alamat tab ini.
  wadah.querySelectorAll('a[href]').forEach((a) => {
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener noreferrer');
  });
  return wadah;
}

function kuotaBar(reg) {
  if (reg.capacity === null || reg.capacity === 0) return null;
  const pakai = Math.min(1, reg.seatsTaken / reg.capacity);
  const sempit = reg.seatsLeft !== null && reg.seatsLeft <= Math.max(1, Math.round(reg.capacity * 0.15));
  return el('div', { class: 'ev-bar' + (sempit ? ' tight' : '') }, [
    el('i', { style: `width:${Math.round(pakai * 100)}%` })
  ]);
}

function barisKursi(reg) {
  if (reg.capacity === null) return null;
  const sempit = reg.seatsLeft <= Math.max(1, Math.round(reg.capacity * 0.15));
  return el('div', { class: 'ev-seats' + (sempit ? ' tight' : '') }, [
    el('span', { text: 'SEATS' }),
    el('span', {}, [
      el('b', { text: String(reg.seatsLeft) }),
      document.createTextNode(` LEFT OF ${reg.capacity}`)
    ])
  ]);
}

const tombolKalender = (ev) => el('button', {
  class: 'ev-btn ghost', type: 'button', text: '+ CALENDAR', onclick: () => saveIcs(ev)
});

// ── formulir pendaftaran ────────────────────────────────────────────────────

function medan(nama, label, { type = 'text', textarea = false, required = false, placeholder = '' } = {}) {
  const kendali = textarea
    ? el('textarea', { name: nama, rows: 2, placeholder })
    : el('input', { name: nama, type, placeholder, ...(required ? { required: 'required' } : {}) });
  const galat = el('em', { hidden: 'hidden' });
  const bungkus = el('div', { class: 'ev-field' }, [el('label', { text: label }), kendali, galat]);
  return { bungkus, kendali, galat };
}

function formPendaftaran(ev, foot) {
  const nama = medan('name', 'NAME *', { required: true, placeholder: 'Nama lengkap' });
  const email = medan('email', 'EMAIL *', { type: 'email', required: true, placeholder: 'nama@email.com' });
  const telp = medan('phone', 'WHATSAPP', { placeholder: 'Opsional' });
  const catatan = medan('note', 'NOTE', { textarea: true, placeholder: 'Ada yang perlu kami tahu? (opsional)' });

  const ringkas = el('p', { class: 'ev-err', hidden: 'hidden' });
  const kirim = el('button', { class: 'ev-btn', type: 'submit', text: 'REGISTER' });

  const form = el('form', { class: 'ev-form', novalidate: 'novalidate' }, [
    ringkas,
    el('div', { class: 'row' }, [nama.bungkus, email.bungkus]),
    el('div', { class: 'row' }, [telp.bungkus, catatan.bungkus]),
    el('div', { class: 'ev-actions' }, [kirim, tombolKalender(ev)])
  ]);

  const medanPeta = { name: nama, email, phone: telp, note: catatan };
  const bersihkan = () => {
    ringkas.hidden = true;
    for (const m of Object.values(medanPeta)) {
      m.bungkus.classList.remove('bad');
      m.galat.hidden = true;
    }
  };

  // Galat server datang berkunci "body.email"; awalannya dibuang di sini supaya
  // pesannya menempel pada field yang benar. Yang tidak punya field sendiri
  // (mis. "registration") jatuh ke pesan ringkas di atas formulir — lebih baik
  // daripada hilang sama sekali.
  const pasangGalat = (m, pesan) => {
    m.bungkus.classList.add('bad');
    m.galat.textContent = pesan;
    m.galat.hidden = false;
  };

  const tandai = (err) => {
    bersihkan();
    let adaField = false;

    // "Email sudah terdaftar" datang sebagai `reason`, bukan sebagai galat
    // per-field — server memang tidak menganggapnya kesalahan pengisian,
    // melainkan bentrokan keadaan. Di layar tetap paling berguna menempel di
    // kolom email: di situlah satu-satunya hal yang bisa diubah orangnya.
    if (err.details?.reason === 'duplicate') {
      pasangGalat(medanPeta.email, 'Email ini sudah terdaftar di acara ini.');
      return;
    }

    for (const [kunci, pesan] of Object.entries(err.details ?? {})) {
      const m = medanPeta[String(kunci).replace(/^body\./, '')];
      if (!m) continue;
      pasangGalat(m, pesan);
      adaField = true;
    }
    if (!adaField) {
      ringkas.textContent = err.message || 'Pendaftaran gagal. Coba lagi sebentar lagi.';
      ringkas.hidden = false;
    }
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    bersihkan();

    const isi = {
      name: nama.kendali.value.trim(),
      email: email.kendali.value.trim(),
      phone: telp.kendali.value.trim(),
      note: catatan.kendali.value.trim()
    };

    // Diperiksa di sini juga, bukan hanya oleh `required` bawaan peramban:
    // formnya `novalidate` supaya gelembung galat bawaan tidak muncul di atas
    // kanvas 3D dengan gaya yang sama sekali berbeda dari sisa halaman.
    const galatLokal = {};
    if (isi.name.length < 2) galatLokal.name = 'Nama minimal 2 huruf.';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(isi.email)) galatLokal.email = 'Alamat email tidak valid.';
    if (Object.keys(galatLokal).length) return tandai({ details: galatLokal });

    kirim.disabled = true;
    kirim.textContent = 'SENDING…';
    try {
      const hasil = await daftarAcara(ev.id, isi);
      foot.replaceChildren(berhasil(ev, hasil));
      catatKursi(ev.id, hasil);
    } catch (err) {
      tandai(err);
      // Kuota bisa habis persis saat formulirnya diisi. Halamannya dimuat ulang
      // supaya angka kursinya jujur dan tombolnya berubah jadi keadaan penuh —
      // membiarkan formulir yang sama terbuka hanya mengundang percobaan kedua
      // yang pasti gagal.
      if (err.details?.reason === 'full') setTimeout(() => openEvent(ev.id), 1400);
    } finally {
      kirim.disabled = false;
      kirim.textContent = 'REGISTER';
    }
  });

  return form;
}

// Kursi yang baru diambil dicatat balik ke entri AGENDA.
//
// Tanpa ini, kartu Event di belakang panel tetap menulis "25 OF 25 SEATS LEFT"
// sesudah orangnya sendiri mengambil satu — angka yang jelas salah bagi
// satu-satunya orang yang tahu persis apa yang barusan terjadi. Server sudah
// membatalkan cache agendanya, tapi daftar di klien baru ikut berubah pada
// kunjungan berikutnya.
//
// Yang dimutasi array yang sama dengan yang diisi `data/remote.js`, jadi
// `agendaState()` berikutnya membacanya sendiri; kejadian `agenda` dari scene
// yang menggambar ulang kartunya. Cap di `event-card.js` sudah memuat
// seatsTaken, jadi perubahan ini benar-benar sampai ke layar.
function catatKursi(id, hasil) {
  const entri = AGENDA.find((a) => a.id === id);
  if (!entri?.registration) return;
  entri.registration = {
    ...entri.registration,
    seatsTaken: hasil.seatsTaken,
    seatsLeft: hasil.seatsLeft,
    open: hasil.seatsLeft === null || hasil.seatsLeft > 0,
    reason: hasil.seatsLeft === 0 ? 'full' : entri.registration.reason
  };

  // Kejadian `agenda` terbit sekali saja dari scene, bukan tiap frame — jadi
  // memutakhirkan arraynya tidak cukup, tidak ada yang akan membacanya lagi.
  // Kejadian yang sama diterbitkan ulang di sini dengan keadaan terbaru.
  //
  // Lewat kejadian, bukan memanggil `event-card.paint()` langsung: `event-card`
  // sudah mengimpor berkas ini untuk membuka detailnya, dan impor balik
  // menutup lingkaran. Kontraknya pun memang sudah ada — `hud.js` mendengarkan
  // `agenda` dan menggambar papan misi sekaligus kartunya, dua-duanya perlu
  // ikut berubah.
  document.dispatchEvent(new CustomEvent('agenda', { detail: agendaState() }));
}

// Kalimatnya sengaja tidak menjanjikan email.
//
// Tidak ada pengirim email di backend ini — pendaftaran hanya tercatat dan
// dibaca panitia lewat dashboard. "Kami kirim pengingat ke …" akan terbaca
// meyakinkan dan sepenuhnya salah, dan orang yang menunggu email itu akan
// menganggap pendaftarannya gagal. Yang ditawarkan sebagai gantinya adalah
// tombol kalender, karena itu pengingat yang benar-benar bisa dipasang.
function berhasil(ev, hasil) {
  return el('div', { class: 'ev-done' }, [
    el('div', { class: 'ev-tick', text: '✓' }),
    el('strong', { text: 'You are on the list' }),
    el('p', { text: `Kursi atas nama ${hasil.registration.name} sudah tercatat. Panitia menghubungi lewat ${hasil.registration.email} kalau ada perubahan — simpan tanggalnya supaya tidak terlewat.` }),
    el('div', { class: 'ev-actions' }, [tombolKalender(ev)])
  ]);
}

// ── kaki, per mode pendaftaran ──────────────────────────────────────────────

function kaki(ev) {
  const foot = el('div', { class: 'ev-foot' });
  const reg = ev.registration ?? { mode: 'none', open: false, reason: 'none' };
  const mundur = hitungMundur(ev.date);

  // Acara yang sudah lewat tidak menampilkan tombol apa pun — termasuk
  // kalender. Menyimpan undangan untuk acara kemarin bukan sesuatu yang pernah
  // dimaksudkan orang.
  if (mundur.lewat) {
    foot.append(el('p', { class: 'ev-hint', text: 'Acara ini sudah berlangsung. Sampai jumpa di acara berikutnya.' }));
    return foot;
  }

  if (reg.mode === 'external') {
    foot.append(
      el('div', { class: 'ev-actions' }, [
        el('a', {
          class: 'ev-btn', href: ev.registerUrl, target: '_blank', rel: 'noopener noreferrer',
          text: `REGISTER ON ${hostDari(ev.registerUrl).toUpperCase()}`
        }),
        tombolKalender(ev)
      ]),
      el('p', { class: 'ev-hint', text: 'Pendaftaran acara ini dikelola panitia di luar situs. Tautannya terbuka di tab baru.' })
    );
    return foot;
  }

  if (reg.mode === 'internal') {
    const barisan = [barisKursi(reg), kuotaBar(reg)].filter(Boolean);
    foot.append(...barisan);

    if (reg.open) {
      foot.append(formPendaftaran(ev, foot));
      return foot;
    }

    const pesan = {
      full: 'Kuota acara ini sudah penuh. Panitia biasanya membuka daftar tunggu di kanal komunitas.',
      closed: 'Pendaftaran sudah ditutup lebih awal untuk acara ini.'
    }[reg.reason] ?? 'Pendaftaran acara ini sedang tidak dibuka.';

    foot.append(
      el('div', { class: 'ev-actions' }, [
        el('button', { class: 'ev-btn', type: 'button', disabled: 'disabled', text: reg.reason === 'full' ? 'FULLY BOOKED' : 'REGISTRATION CLOSED' }),
        tombolKalender(ev)
      ]),
      el('p', { class: 'ev-hint', text: pesan })
    );
    return foot;
  }

  // mode 'none' — acara terbuka.
  foot.append(
    el('div', { class: 'ev-actions' }, [tombolKalender(ev)]),
    el('p', { class: 'ev-hint', text: 'Acara terbuka — tidak perlu mendaftar, datang saja.' })
  );
  return foot;
}

function gambar(ev) {
  const mundur = hitungMundur(ev.date);

  // Acara tanpa uraian panjang tetap boleh dibuka (yang menariknya formulir
  // pendaftaran), jadi bagian tengah ini benar-benar bisa kosong.
  //
  // Disaring sebelum masuk `replaceChildren`, bukan diserahkan ke sana:
  // `replaceChildren(null)` menyisipkan teks "null" ke halaman, persis seperti
  // `append(null)` — DOM mengubah apa pun yang bukan Node jadi string, dan
  // tidak ada galat yang terbit. Yang muncul cuma kata "null" di tengah kartu.
  const bagian = [
    el('div', { class: 'ev-head' }, [
      el('button', { class: 'ev-close', type: 'button', 'aria-label': 'Close', text: '×', onclick: closeEvent }),
      el('div', { class: 'ev-top' }, [
        el('span', { class: 'ev-kind', text: ev.kind }),
        el('span', { class: 'ev-when' + (mundur.dekat ? ' soon' : ''), text: mundur.teks })
      ]),
      el('h2', { class: 'ev-title', text: ev.title }),
      fakta(ev)
    ]),
    uraian(ev.descriptionHtml) ?? (ev.note ? el('div', { class: 'ev-body' }, [el('p', { text: ev.note })]) : null),
    kaki(ev)
  ].filter(Boolean);

  card.replaceChildren(...bagian);
  card.scrollTop = 0;
  // Fokus pindah ke kartunya supaya Tab berikutnya masuk ke formulir, bukan ke
  // kendali HUD yang sekarang tertutup scrim.
  card.querySelector('input, button, a')?.focus?.({ preventScroll: true });
}

// ── pintu masuk ─────────────────────────────────────────────────────────────

export async function openEvent(id) {
  if (!id) return;
  pemulih = pemulih ?? document.activeElement;
  terbuka = id;
  root.classList.add('on');
  document.documentElement.classList.add('ev-open');
  card.replaceChildren(el('div', { class: 'ev-load', text: 'OPENING…' }));

  try {
    const ev = await muatAcara(id);
    // Orang bisa menutup panelnya sementara permintaannya masih di jalan.
    // Tanpa penjagaan ini, jawabannya tetap tergambar ke kartu yang sudah
    // ditutup, dan panelnya terbuka lagi sendiri beberapa detik kemudian.
    if (terbuka !== id) return;
    gambar(ev);
  } catch (err) {
    if (terbuka !== id) return;
    card.replaceChildren(
      el('div', { class: 'ev-head' }, [
        el('button', { class: 'ev-close', type: 'button', 'aria-label': 'Close', text: '×', onclick: closeEvent }),
        el('h2', { class: 'ev-title', text: 'Detail acara belum bisa dibuka' })
      ]),
      el('div', { class: 'ev-foot' }, [
        el('p', { class: 'ev-hint', text: err.status === 404
          ? 'Acara ini sudah tidak tersedia.'
          : 'Sambungan ke server sedang bermasalah. Jadwalnya tetap terlihat di kartu Event.' })
      ])
    );
  }
}

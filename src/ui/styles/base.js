// Dasar antarmuka: token warna, lapisan, dan penyesuaian tata letak yang
// menyentuh template lama (menyembunyikan kendali yang sekarang digantikan,
// menggeser panel supaya tidak tertimpa instrumen).
//
// Semua nilai warna hidup di sini sebagai custom property, jadi mengganti tema
// tidak berarti menyisir belasan berkas komponen.
export const css = `:root {
  --hud-paper: #f3f2f8; --hud-muted: #8f8aa3; --hud-dim: #6c6782;
  --hud-iris: #9E94F9; --hud-mint: #a99bf2; --hud-accent: #6a5ae0; --hud-hot: #ff8a3d;
  --hud-mono: 'IBM Plex Mono', ui-monospace, SFMono-Regular, monospace;
}

/* kendali lama tetap ada di DOM — tombol baru menekannya dari belakang */
[data-ui="actiongroup"], [data-ui="mode"], [data-ui="hints"], [data-ui="readout"],
[data-ui="xrline"], [data-ui="brandtag"], [data-intro] { display: none !important; }

.hud-layer { position: fixed; inset: 0; z-index: 33; pointer-events: none; color: var(--hud-paper); font-family: 'Instrument Sans', system-ui, sans-serif; }

@keyframes hudBeat { 0%, 100% { transform: scale(1); opacity: .75; } 50% { transform: scale(1.35); opacity: 1; } }

@keyframes hudSpin { to { transform: rotate(360deg); } }

/* layar sedang: hero dan peta orbit tidak boleh berebut sudut kanan bawah */

/* Gugus instrumen menempati sudut kanan atas sampai ~123px. Panel planet dan
   manifes Insight dulu mulai dari 96px, jadi keduanya saling tindih begitu
   sebuah planet dibuka. Keduanya digeser turun — hanya di layar lebar, karena
   di ponsel panelnya memang lembar bawah. */
@media (min-width: 780px) {
  /* kakinya juga dinaikkan supaya panel berhenti di atas peta orbit di sudut
       kanan bawah; isinya sendiri sudah bisa digulung */
    [data-panel] { top: 146px !important; bottom: 176px !important; }
  .pn-manifest { padding-top: 152px !important; }
}

@media (max-width: 779px) {
  /* 2. Kartu konten harus menang atas apa pun yang ditumpanginya — tombol
       panduan di kiri bawah dulu mengambang di atasnya. */
    [data-panel] { z-index: 40 !important; }
  /* 3. Kepala halaman menyusut selebar mereknya saja, jadi tombol mode tidak
       lagi terlihat mengambang di dalam kotak yang kebesaran.

       Angka cadangannya diukur, bukan ditebak: gugus instrumen di kanan atas
       berhenti di 78px lebar (meteor + portal VR) atau 126px kalau tombol AR
       ikut tampil, ditambah 12px jarak ke tepi. 152px memberi ruang untuk
       keduanya beserta jeda yang wajar.

       Nilai lamanya 244px — ukuran gugus SEBELUM alat pandang dilipat, saat
       barisnya masih memuat orb status dan label MODE VR. Sisanya tinggal
       134px di layar 378px, sementara "Spatial Indonesia" butuh 174px: itulah
       kenapa mereknya terpotong jadi "Spatial In…". */
    [data-ui="header"] { right: auto !important; width: max-content !important; max-width: calc(100vw - 152px) !important; }
  /* Di 320px cadangan itu menyisakan 168px, sementara pil mereknya butuh 174px
     — kurang enam. Yang mengalah bantalan pilnya, bukan cadangan untuk gugus
     instrumen: "clamp" membuatnya menyusut sendiri di layar tersempit dan
     kembali penuh mulai ~480px, jadi tidak ada breakpoint kedua yang lahir
     hanya demi satu ukuran ponsel. */
    [data-ui="header"] { padding-left: clamp(7px, 2.5vw, 12px) !important; padding-right: clamp(7px, 2.5vw, 12px) !important; }
}`;

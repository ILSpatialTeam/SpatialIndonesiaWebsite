# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Situs tata surya interaktif Spatial Indonesia: three.js + WebXR, dibungkus template
Design Canvas. Komentar kode, teks antarmuka, dan catatan proyek ditulis dalam
Bahasa Indonesia — ikuti kebiasaan itu, dan jelaskan **alasan** sebuah keputusan,
bukan mengulang apa yang sudah terbaca dari kodenya.

## Menjalankan

Frontend tidak punya `package.json` dan tidak punya dependensi terpasang.
Berkasnya statis, tapi **harus lewat HTTP** (ES modules + `fetch` tidak jalan dari
`file://`). Backend punya dependensinya sendiri di `backend/`; keduanya tidak
pernah berbagi `node_modules`. Tidak ada test runner di dua-duanya.

```bash
python3 -m http.server 8899        # lalu buka http://localhost:8899/index.html
node build.mjs                     # rakit rilis → dist/ (esbuild diambil via npx)
node --check src/systems/aurora.js # pemeriksaan sintaks satu berkas (lihat catatannya di bawah)

cd backend && npm run dev          # API + dashboard admin di :4000
```

Frontend tetap bisa dibuka tanpa backend hidup — datanya jatuh ke nilai bawaan
di `src/data/*`. Yang hilang cuma kemutakhirannya, bukan tata suryanya.

Tidak ada linter dan tidak ada uji otomatis. **Verifikasi dilakukan di browser** —
buka halamannya, jalankan fiturnya, dan periksa konsol. Uji juga `dist/index.html`
setelah merakit: bundling mengubah urutan eksekusi dan pernah menyingkap bug yang
tidak muncul di mode berkas terpisah.

Lebar 780px adalah satu-satunya breakpoint, dipakai konsisten di CSS (`@media`),
di `core/dom.js` (`wide()`), dan di `index.html` (`MOBILE`). Selalu periksa ulang
di ~390px setelah menyentuh tata letak.

## Peta arsitektur

`ARCHITECTURE.md` memuat peta lengkap beserta pemetaan SOLID-nya. Yang perlu
diketahui sebelum menyentuh apa pun:

```
index.html          template Design Canvas (bukan HTML biasa) + isi teks
support.js          runtime Design Canvas (pihak ketiga, jangan disunting)
src/main.js         titik masuk tunggal
src/core/           perkakas tanpa pengetahuan domain (three, bus, registry, context)
src/data/           bentuk data + seam ke API (remote.js)
src/systems/        fitur 3D yang berdiri sendiri
src/scene/          panggung + pendaftaran sistem
src/ui/             atomic design: atoms → molecules → organisms
src/app/            penyusun (hud.js, ambience.js)
backend/            proyek terpisah: REST API, PostgreSQL, dashboard admin
```

Frontend dan backend sengaja dipisah total: `backend/` punya package.json,
dependensi, dan README sendiri, dan tidak satu pun berkas di `src/` yang
mengimpornya. Keduanya hanya bertemu di HTTP.

### index.html adalah berkas Design Canvas

Halamannya dirender React lewat `support.js`: markup `<x-dc>` dengan gaya inline,
atribut `style-hover`, binding `onClick="{{ handler }}"`, dan logika komponen di
dalam blok `<script type="text/x-dc">` (`class Component extends DCLogic`, handler
dikembalikan dari `renderVals()`). Konsekuensi yang sering menggigit:

- **Kerangka kerja memiliki subtree-nya.** DOM yang disuntikkan ke dalam simpul
  milik template bisa terhapus saat React merender ulang. Contoh nyata:
  `event-card.js` mengawasi wadahnya dengan `MutationObserver` dan menggambar
  ulang kalau isinya hilang.
- **Elemen template belum tentu ada** saat modul dijalankan. Pakai
  `whenPresent()` dari `core/dom.js`, jangan menebak urutan.
- Modul UI membangun DOM-nya sendiri lalu memasangnya ke `document.body` — di
  luar pohon React — persis seperti `insight-reader.js` dan `meteor-hud.js`.

### Pola "HUD bayangan"

Kendali lama di dalam template (tombol VR/AR/meteor, baris status, petunjuk)
**tidak dihapus, hanya disembunyikan lewat CSS**. Tombol baru di `src/ui`
menekannya dari belakang layar:

```js
press('[data-ui="vrbtn"]');   // core/dom.js
```

Alasannya: seluruh penanganan galat WebXR yang sudah matang (HTTPS, izin kamera,
`NotSupportedError`, dsb.) hidup di komponen `index.html`. Jangan menyalin logika
itu ke `src/`, dan jangan menghapus tombol tersembunyi itu karena tampak tak
terpakai. Hal yang sama berlaku untuk `[data-hud="mode"]` dan `[data-hud="xr"]`:
HUD baru mencerminkan isinya lewat `MutationObserver`.

### Permukaan planet datang dari gambar, bukan dari model

Tiap planet memakai peta permukaan asli di `assets/planets/*.webp`, dipetakan ke
`SphereGeometry` biasa — peta planet selalu ekuirektangular, dan itu persis tata
UV yang sudah dihasilkan SphereGeometry. Berkas model 3D (`assets/3d/Planets.fbx`)
**tidak dimuat**: isinya cuma bola ber-UV yang bisa dibuat satu baris, sementara
memuatnya menuntut FBXLoader beserta ongkosnya.

Teksturnya dimuat belakangan lewat `skinTexture()` di `core/texture.js` dan
sengaja tidak ditunggu — bolanya tampil dulu dengan warna paletnya. Kalau
gambarnya gagal dimuat, yang tersisa tetap tata surya yang utuh.

Cahaya matahari memakai `decay` 0,9, bukan 2. Dengan hukum kuadrat terbalik yang
jujur, planet terluar menerima sepersepuluh cahaya planet terdalam — benar secara
fisika, celaka sebagai menu. Jangan "memperbaiki"-nya kembali ke 2.

### Layar sempit: yang tampil di ketukan pertama

Aturan yang dipegang di bawah 780px: pengunjung baru tidak disodori seluruh
kemampuan situs sekaligus. Yang berdiri sendiri di layar pertama hanya yang
membawanya ke suatu tempat — merek, strip rencana penerbangan di bawah, tombol
panduan, dan mode (meteor/AR/VR). Sembilan alat pandang melipat ke balik satu
tombol di `ui/organisms/toolbelt.js` dan muncul sebagai daftar bernama saat
diminta.

Strip rencana penerbangan (`[data-ui="flightplan"]`) juga tidak ikut ke ponsel.
Di layar lebar ia daftar tegak di kiri yang tidak mengambil apa pun dari
pemandangan; di ponsel ia jadi baris kapsul menggulung yang memakan 44px kaki
layar seumur kunjungan dan menuntut gulir mendatar untuk melihat tujuh isinya.

**Kapsul nama planet justru yang menggantikannya sebagai navigasi di ponsel** —
ia melayang di planetnya sendiri dan bisa disentuh (`data-goto`). Jangan
menyembunyikan keduanya sekaligus: tanpa strip DAN tanpa kapsul, satu-satunya
jalan berpindah tinggal menebak planet mana yang disentuh. Jalan pulangnya aman
dari sisi lain — tombol `×` di tiap panel memanggil handler yang sama dengan
"RETURN TO FREE ORBIT", jadi tidak ada jalan buntu setelah sebuah planet dibuka.

Elemennya disembunyikan, bukan dihapus: `press('[data-nav="…"]')` dari rel dan
modul lain tetap bekerja, karena `.click()` pada elemen `display:none` tetap
terkirim.

Pelipatannya **murni CSS** di breakpoint yang sama; tidak ada cabang JavaScript
yang mengukur lebar layar. Lacinya juga tidak membuat tombol sendiri — ia
menerima larik `tools` yang sama dengan yang dipakai gugus, membaca nama dari
`aria-label`, dan meneruskan ketukan lewat `.click()`. Menambah alat baru cukup
satu baris di `app/hud.js`; laci dan gugus sama-sama ikut tanpa disunting.

Dua hal yang gampang terlewat kalau menyentuhnya:

- Saat tertutup, laci tetap `display:flex` supaya transisinya jalan. Elemen
  ber-`opacity: 0` **masih menangkap pointer** — tanpa `pointer-events: none`
  dan `visibility: hidden`, seperempat layar kanan atas berhenti merespons
  sentuhan pada kanvas, tanpa apa pun yang terlihat di sana.
- Keadaan sakelar disalin saat laci **dibuka**, bukan diikuti terus-menerus.
  Sebuah alat bisa menyala dari mana saja; sembilan pengawas demi panel yang
  99% waktunya tertutup bukan pertukaran yang baik.

### Sudut kiri bawah dipakai berdua

`.hud-corner` (didefinisikan di `ui/organisms/social.js`) adalah satu-satunya
elemen berposisi di pojok kiri bawah; tombol panduan dan tautan kanal sosial
duduk di dalamnya sebagai baris flex. Sebelumnya `.hud-info` memegang
koordinatnya sendiri — dan koordinat itu berpindah di ponsel (naik ke atas strip
rencana penerbangan), jadi menaruh penghuni kedua dengan `left`/`bottom`-nya
sendiri berarti dua tempat yang harus ingat untuk bergeser bersamaan.

Konsekuensi yang perlu diingat: `.hud-info` sekarang `position: relative` (panel
panduan tetap berlabuh padanya), dan **aturan yang menyembunyikan antarmuka di
mode fokus dan mode baca menyebut `.hud-corner`, bukan `.hud-info`** — keduanya
ada di `organisms/cluster.js`. Menambah penghuni ketiga di sudut itu cukup
menaruhnya di dalam `.hud-corner`; ia ikut menghilang tanpa aturan baru.

Bentuknya sengaja berbeda dari tombol panduan di sebelahnya: yang satu
instrumen (bercincin, berlatar), yang dua tautan (glif polos di balik garis
pemisah tipis). Tiga lingkaran seragam bermakna berbeda terbaca sebagai
tumpukan, bukan sebagai kelompok.

Di ponsel sudut itu duduk 46px dari tepi bawah, bukan menempel: bingkai
dekoratif template punya siku 22px di inset 16px, dan lebih rendah dari itu
sikunya memotong lingkaran tombol panduan tepat di tengah. Di layar lebar
angkanya tetap 26px — di sana pemilih kursor hanya 10px di atas baris ini, jadi
menaikkannya berarti menabrak sesuatu yang nyata demi menghindari yang
dekoratif.

Aturan `.hud-corner > .hud-info { position: relative }` dinyatakan ulang di
`social.js` walau `info-panel.js` sudah menyatakannya. Itu disengaja: dalam mode
berkas-lepas keduanya diambil sebagai permintaan terpisah, dan satu salinan lama
`info-panel.js` di cache peramban sudah cukup untuk menarik tombol panduan
keluar dari baris — hasilnya tiga lingkaran berserakan diagonal dan saling
tindih. Aturan yang lebih spesifik ini menang atas versi mana pun yang termuat.

Alamat Instagram dan LinkedIn ditulis di dua tempat: `KANAL` di `social.js`
(tautan yang bisa diklik) dan `sameAs` di blok JSON-LD `index.html` (data
terstruktur untuk mesin pencari). Yang kedua harus tetap statis di HTML —
perayap yang tidak menjalankan JavaScript tidak akan pernah melihat yang
disuntik dari modul.

### Jalur kritis di `index.html`

Bagian berlabel `══ JALUR KRITIS ══` di `<head>` bukan hiasan. Tanpa itu
urutannya berantai lurus, tujuh langkah dengan empat perjalanan ke unpkg,
sebelum satu piksel tata surya digambar:

```
index.html → support.js → React → React boot → <helmet> dipasang
           → src/main.js → three.module.min.js → three.core.min.js
```

Yang membuat rantai itu tidak terlihat adalah letaknya: `<script type="module">`
dan stylesheet font **dulu tinggal di dalam `<helmet>`**, artinya keduanya baru
diminta setelah React selesai boot. Sekarang alamatnya diumumkan lebih awal
lewat `preload`/`modulepreload`, dan urutan eksekusinya sendiri tidak berubah.

Tiga hal yang menjaga blok itu tetap benar:

- **Nomor versi ditulis dua kali** — di sini dan di `support.js` /
  `core/three.js`. Kalau salah satunya naik sendiri, akibatnya unduhan mubazir,
  bukan halaman rusak. Tetap saja: ubah berpasangan.
- **`x-dc { display: none }` harus tetap ada di `<style>` `<head>` asli.**
  Aturan itulah yang membuat `support.js` boleh `defer`. Kalau dihapus, markup
  mentah template berkedip sebelum React boot.
- **Layar boot statis `[data-boot]`** adalah kembaran HTML biasa dari layar boot
  yang dirender React. Ia yang membuat gambar pertama terjadi tanpa JavaScript
  sama sekali, dan ia elemen LCP halaman ini. Yang menyingkirkannya cuma
  `hideLoader()`.

### Menambah fitur 3D

Loop utama berbunyi `this.systems.update(t, dt)` dan tidak menyebut satu pun nama
fitur. Sebuah sistem hanyalah objek:

```js
// src/systems/nebula.js
export function createNebula(ctx) {
  return { name: 'nebula', build() {…}, update(t, dt) {…}, dispose() {…} };
}
// src/scene/solar-system.js — satu baris di connectedCallback
this.systems.add(createNebula);
```

`ctx` sengaja sempit (lihat `core/context.js`): panggung, dunia, kamera, `bus`,
`bodies` (tanya posisi planet), dan `view` (satu-satunya port untuk menyentuh
kamera/keadaan pandangan). Kalau sebuah sistem butuh sesuatu di luar itu,
biasanya ia sedang mengambil terlalu banyak tanggung jawab — tambahkan method
pada port, jangan bocorkan seluruh scene.

Aturan yang dijaga: `systems/` tidak menyentuh DOM, `ui/` tidak mengimpor
three.js. Keduanya bicara lewat `core/bus.js`.

### Kontrak kejadian

Scene memancarkan, UI mendengarkan. Sisi 3D tidak pernah memanggil UI langsung:

`scene-ready` · `planet-focus` / `planet-free` / `planet-hover` ·
`agenda` · `sky-lore` / `sky-aim` · `trails` · `visitors` ·
`sky-stars` / `sky-star-hover` / `sky-star-open` · `aurora` · `milkyway` ·
`meteor-start` / `meteor-armed` / `meteor-end` / `meteor-hit` / `meteor-shot` /
`meteor-hud` / `meteor-over` / `meteor-restart` · `insight-open` / `insight-close` /
`insight-external` ·
`xr-support` / `xr-end` / `xr-error` · `ar-support` / `ar-start` / `ar-placed`

Dua di antaranya sering tertukar dan pernah memakan waktu: **`sky-lore` terbit
tepat saat mode rasi dinyalakan atau dimatikan; `sky-aim` hanya terbit saat
posisi langit dihitung ulang** — sekali di awal, lalu tiap 60 detik. Keduanya
membawa `on`, tapi kalau yang dibutuhkan adalah reaksi terhadap tombol, hanya
`sky-lore` yang cukup cepat.

Elemen `<solar-system>` juga punya API publik yang dipakai HUD:
`travelTo` · `freeFlight` · `setConstellations` / `skyReport` · `setTrails` /
`presenceCount` · `setVisitors` / `visitorCount` ·
`skyStarCount` / `skyCoordAt` / `addSkyStar` / `markMyStar` / `findMyStar` ·
`setAurora` · `setMilkyWay` · `setMeteorMode` / `restartMeteor` / `fireAt` ·
`agendaNow` · `systemMap` (data peta orbit + panning audio) · `snapshot`
(kartu pos) · `openArticle` / `closeArticle` · `enterVR` / `enterAR`.

### Dua fitur yang butuh orang lain

Keduanya hidup di `src/systems/` seperti sistem lain, tapi sumber datanya bukan
`src/data/` melainkan backend yang sedang jalan.

**Presence live** (`systems/visitors.js` + `data/live.js`). Tiap pengunjung yang
sedang membuka situs tampil sebagai satu titik cahaya yang melayang di dekat
planet yang ia lihat. Jalurnya SSE satu arah (`GET /presence/live`); laporan
balik lewat `POST /presence/here` biasa. Tidak ada nama, avatar, atau obrolan —
yang dibagikan cuma gerak, dan itu menutup seluruh permukaan moderasi sekaligus.

Server menyiarkan `move` ke **semua** koneksi termasuk pengirimnya; yang
menyaring diri sendiri adalah klien (`bukanAku` di `live.js`). Itu memang
tempatnya: siapa yang perlu digambar adalah keputusan tampilan.

**Langit komunitas** (`systems/community-sky.js` + `ui/organisms/star-place.js`).
Satu bintang per pengunjung, ditaruh sendiri dengan menunjuk langit. Semua
bintang digambar dalam satu `THREE.Points` — seribu Sprite terpisah berarti
seribu draw call, sementara jumlahnya memang bisa tumbuh tanpa batas jelas.
Matematika koordinatnya dipinjam dari `sky-lore.js` (`arahDari`, `raDecDari`),
jadi bintang komunitas dan rasi Nusantara duduk di sistem koordinat yang sama.

Aturan "satu orang satu bintang" dijaga unique index atas salted hash alamat IP
di sisi server; alamat mentahnya tidak pernah disimpan.

Kendalinya satu tombol instrumen di gugus kanan atas, tepat di sebelah tombol
rasi — aksinya memang milik mode langit itu. Tombolnya **selalu ada**, tidak
muncul-hilang mengikuti mode rasi: baris instrumen yang isinya berubah-ubah
menggeser tombol tetangganya tiap kali mode dinyalakan. Kalau langitnya belum
menyala, tombol ini yang menyalakannya lebih dulu. Versi pertamanya adalah pil
bertulisan di tengah bawah layar; ia duduk persis di atas tata suryanya, dan
dalam keadaan "sudah punya bintang" berubah jadi papan status permanen.

Tiap bintang membawa nama depan, kota, dan satu kalimat — dan ketiganya baru
ada gunanya kalau bisa dibaca. `ui/organisms/star-card.js` menampilkannya:
scene memancarkan `sky-star-hover` (penunjuk) dan `sky-star-open` (ketukan),
keduanya dengan koordinat layar supaya kartunya tahu muncul di sebelah mana.
Dua kejadian, bukan satu, karena layar sentuh tidak punya hover dan bintangnya
terlalu kecil untuk diberi ukuran sentuh yang layak.

Bentuknya bintang berkilau empat sudut, bukan cakram gradien seperti bintang
latar dan rasi — yang bulat adalah langit, yang berkilau adalah titipan orang.
Kedipannya **per bintang**, lewat warna simpul (`vertexColors`): PointsMaterial
tidak punya alpha per titik, tapi di atas AdditiveBlending meredupkan warna sama
saja dengan meredupkan bintangnya, dan itu menghindari ShaderMaterial sendiri
untuk satu efek kecil. Fase tiap bintang diturunkan dari id-nya, jadi tetangga
tidak berdenyut serempak — satu nilai sinus untuk seluruh material terbaca
sebagai kedipan layar, bukan kedipan bintang.

Pemilihannya diukur di **layar**, bukan di dunia (`bintangDekat` di
`community-sky.js`). Bola langitnya berjari-jari 168 satuan: ambang dalam
satuan dunia akan terasa lebar ke satu arah dan sempit ke arah lain. Bintang
ditanyakan **paling akhir** dalam rantai hover — setelah bulan dan planet —
karena apa pun yang menutupinya di layar pasti berada di depannya.

### Urutan impor di `src/main.js` disengaja

Antarmuka dimuat **sebelum** panggung. `customElements.define` memperbarui elemen
seketika, jadi kalau panggung duluan, kejadian pertamanya lewat sebelum ada yang
mendengarkan. Dalam mode berkas terpisah hal ini tersamarkan oleh jeda jaringan;
di bundel rilis ia langsung terasa.

### Lapisan data sudah tersambung ke API

`src/data/remote.js` adalah seam-nya, dan cara kerjanya perlu dipahami sebelum
menyentuh apa pun di `src/data/`:

- Modul itu **memutasi isi** `PLANETS`, `PANELS`, `ARTICLES`, `AGENDA`, dan
  kawan-kawannya di tempat, bukan menggantinya. Belasan berkas sudah
  mengimpornya sebagai binding, dan mengisi ulang array yang sama membuat semua
  pengimpor melihat data baru tanpa satu baris pun diubah.
- Snapshot localStorage diterapkan **sinkron saat modul dievaluasi**, dan
  `main.js` mengimpornya paling awal. Evaluasi modul ES berurutan, jadi saat
  `solar-system.js` mulai dievaluasi, datanya sudah yang terbaru — kunjungan
  kedua tidak menunggu jaringan sedetik pun sebelum bingkai pertama.
- Data dari jaringan datang belakangan dan memancarkan `data-ready`. Yang perlu
  menggambar ulang mendengarkannya: `panel-content.js` dan `_buildMoons()`.
- **`NAV` dihitung dari `PLANETS` saat modul dimuat**, jadi ia tidak ikut
  berubah sendiri dan harus diisi ulang terpisah. Kaitan tersembunyi seperti ini
  yang paling gampang terlewat saat menambah data baru.

`agendaState()` sengaja tetap hidup di sisi klien walau backend punya
salinannya (`backend/src/domain/entities/agenda.js`). Sudut planet Event
dihitung tiap frame; yang datang dari server adalah **daftar acaranya**, bukan
keadaannya.

Alamat API dibaca dari `<meta name="spatial-api">` di `index.html`.

### Isi tujuh menu datang dari database

Panel `<div data-panel="…">` di `index.html` diberi penanda `data-slot`
(`eyebrow`, `title`, `lead`, `items`, `links`), dan `ui/organisms/panel-content.js`
mengisinya. Dua hal yang perlu diingat sebelum menyentuhnya:

- Baris pertama tiap daftar dipakai sebagai **cetakan**: ia dikloning lalu
  teksnya diganti. Jadi mengubah desain panel cukup di `index.html` seperti
  biasa — jangan menyalin gaya inline itu ke JavaScript.
- Panelnya milik React, jadi ada `MutationObserver` seperti `event-card.js`.
  Pengawasnya **dilepas selama menggambar**; tanpa itu ia membangunkan dirinya
  sendiri dan tab-nya membeku.

Tombol tutup dan form Gabung sengaja tidak disentuh sama sekali — keduanya
masih dipegang binding `{{ }}` milik template.

### UI: atomic design

Tiap komponen membawa CSS-nya sendiri (`export const css`); `ui/styles.js` hanya
menjahit. Menambah komponen berarti menambah berkas dan satu baris di perakit —
jangan menaruh aturan baru di `styles/base.js` kecuali ia benar-benar token atau
penyesuaian tata letak global.

## Jebakan yang sudah pernah menggigit

- **Permintaan lintas-origin bisa gagal tanpa satu pun galat di konsol.** Header
  yang tidak termasuk daftar aman CORS — `If-None-Match` salah satunya — memicu
  preflight. Kalau header itu tidak ada di `allowedHeaders` backend, preflight-nya
  **berhasil** (204) tapi permintaan sebenarnya dibatalkan browser diam-diam.
  Gejalanya: data tidak pernah diperbarui, konsol bersih. Yang menunjukkannya
  cuma log server — `OPTIONS` tanpa `GET` setelahnya.
- **Skrip `type="module"` diambil dalam mode CORS walau same-origin**, jadi ia
  membawa header `Origin`. Daftar putih CORS yang tidak memuat origin server
  sendiri akan menolak modul dashboard-nya sendiri.
- **`induk.append(null)` menyisipkan teks "null" ke halaman.** DOM mengubah apa
  pun yang bukan Node jadi string, jadi `syarat ? node : null` yang diteruskan
  langsung ke `.append()` muncul di layar tanpa galat. Pakai helper yang
  menyaring (`el()` di `src/ui/atoms/el.js`, `pasang()` di dashboard admin).
- **Properti instans menutupi method prototipe.** `this.taxonomy = repo` di
  konstruktor membuat method `taxonomy()` di kelas yang sama tidak akan pernah
  bisa dipanggil. Sudah kejadian dua kali di `backend/src/application/services/`.
- **`MutationObserver` yang mengamati subtree lalu mengubah subtree itu akan
  memakan dirinya sendiri.** Lepas pengawasnya selama menggambar, dan buang
  catatannya dengan `takeRecords()` sebelum menyambung lagi.
- **Animasi keyframe dengan `fill: both` menimpa `transform` di media query.**
  Elemen yang dipusatkan dengan `translateX(-50%)` butuh keyframe versinya
  sendiri per breakpoint (lihat `mtInX`/`mtInY` di `meteor-hud.js`).
- **Kanvas 3D memakai `touch-action: none`.** Apa pun yang perlu digulir di layar
  sentuh harus menerima pointer sendiri, bukan mengandalkan elemen anak
  (`insight-reader.js` memakai kelas `pn-touch` dari jenis pointer, bukan lebar
  layar — Vision Pro berjendela lebar tapi bermasukan sentuh).
- **`requestAnimationFrame` dan animasi CSS berhenti saat tab di latar
  belakang.** Pengukuran yang diambil tepat setelah perubahan lewat konsol bisa
  menyesatkan; jam yang berbasis `performance.now()` (mis. penyalaan mode meteor)
  sengaja dipakai supaya tidak menggantung.
- **Verifikasi lewat kelas CSS saja tidak cukup.** Panduan pernah lolos uji
  karena kelas `open` terpasang, padahal panelnya belum dipasang ke DOM.
- **`node --check` memeriksa berkas sebagai skrip, bukan sebagai modul ES.**
  Satu backtick nyasar di dalam `export const css = \`…\`` — misalnya di dalam
  komentar CSS — menutup template-nya lebih awal, dan sisa berkasnya jadi
  omong kosong. `node --check` tetap keluar dengan kode 0; browser menolaknya
  dengan `SyntaxError`. Modul yang menyimpan CSS-nya sendiri tidak pernah cukup
  diverifikasi dengan `node --check` saja.
- **Elemen ber-transform adalah containing block bagi keturunan
  `position: fixed`.** Anak yang `fixed` di dalamnya berhenti mengacu ke
  viewport dan mulai mengacu ke induknya. Yang memicunya bisa cuma sebuah
  `animation` yang menganimasi transform — petunjuk bidik bintang pernah
  melompat ke panel kanan atas karena ini, dan gejalanya tampak seperti salah
  hitung posisi, bukan seperti aturan CSS.
- **`getBoundingClientRect` ikut menghitung transform, `offsetTop`/`offsetHeight`
  tidak.** Elemen HUD punya animasi masuk yang menggeser dan menyusutkan — dan
  animasi CSS membeku di tab latar belakang, jadi transform separuh jalan itu
  bisa bertahan lama. Untuk menempelkan satu elemen ke elemen lain, ukur dengan
  `offsetTop`/`offsetHeight` (lihat `tempelDiBawahGugus` di `star-place.js`).
- **`ctx.glowTexture` adalah pabrik tekstur, bukan tekstur.** Meneruskannya
  langsung sebagai `map` menghasilkan shader yang gagal dikompilasi dengan pesan
  `'uvundefined' : undeclared identifier` — three.js membaca `map.channel` yang
  tidak ada. Panggil sekali di `build()` dan pakai hasilnya bersama-sama.
- **Pendengar `pointerdown` di `window` fase capture melihat SEMUA klik.**
  Termasuk yang jatuh di tombol HUD. Kalau koordinatnya diukur terhadap
  `e.target`, klik di tombol kecil menghasilkan koordinat yang ngawur — periksa
  dulu bahwa targetnya memang kanvas (`star-place.js`).
- **Cadangan lebar untuk kepala halaman di ponsel harus diukur ulang tiap kali
  gugus instrumen berubah.** `[data-ui="header"]` dibatasi
  `max-width: calc(100vw - N)` supaya tidak menabrak gugus di kanan atas. Angka
  N pernah 244px — ukuran gugus sebelum alat pandang dilipat — dan sisa 134px di
  layar 378px membuat mereknya terpotong jadi "Spatial In…". Sekarang 152px,
  diukur dari gugus yang berlaku (78px, atau 126px kalau tombol AR tampil).
  Gejalanya tidak pernah muncul di layar lebar.
- **Backtick di dalam `export const css` menutup template-nya lebih awal**, dan
  `node --check` meloloskannya. Paling sering terjadi saat menyebut nama
  properti CSS dalam komentar berbahasa Indonesia. `build.mjs` sekarang
  memeriksanya lebih dulu dan menyebut berkas serta barisnya — esbuild memang
  menangkapnya juga, tapi pesannya menunjuk kata acak di tengah kalimat.
- **Menulis `<x-dc>` lengkap di dalam komentar HTML merusak halaman.**
  support.js mencari awal template sebagai TEKS di dalam `innerHTML`, dan
  komentar ikut terbaca — jadi kecocokan pertamanya bisa jatuh di dalam
  komentar, dan sisa kalimatnya dirender sebagai isi halaman. Sebut nama
  elemennya tanpa kurung sudut. Tidak ada galat apa pun; yang terlihat cuma
  paragraf Bahasa Indonesia nyasar di atas tata suryanya.
- **Jangan menggantungkan pengambilan data awal pada kejadian sekali-jalan.**
  `scene-ready` terbit satu kali; modul yang mendengarkannya sedetik terlambat
  tidak pernah mendapat jawaban dan diam-diam menampilkan keadaan yang salah.
  Ambil datanya saat modul dimuat, lalu tunggu scene-nya kalau perlu.

## Rilis

`node build.mjs` menghasilkan `dist/` (bundel terkompresi + `index.html` yang
menunjuk ke sana). Isi `public/` disalin apa adanya ke akar `dist/` — tempat
berkas yang harus tersaji dengan namanya sendiri di root domain (bukti
kepemilikan Search Console, `favicon.ico`). Perakit membuka dengan `rm -rf
dist`, jadi menaruhnya langsung di sana berarti ia lenyap di rilis berikutnya.

Tidak semua isi `assets/` ikut terkirim: `assets/icons/*png`, `assets/3d`, dan
`assets/planets/*.jpg` disaring di langkah penyalinan karena tidak dirujuk satu
baris pun. Berkasnya tetap ada di repo. **Unggah isi `dist/`, jangan `src/`, dan jangan sampai `.git/`
ikut terunggah.** `DEPLOY.md` memuat alasannya, termasuk penjelasan jujur bahwa
kode klien tidak bisa dibuat tidak-bisa-disalin — yang bisa dilakukan hanya
menaikkan ongkosnya dan memindahkan rahasia ke sisi server.

## Berkas lama

`scene.js` dan `Spatial Indonesia.dc.html` adalah layar versi gulir yang lama;
keduanya tidak dimuat `index.html`. `github.md` adalah catatan sinkronisasi repo
yang sudah usang.

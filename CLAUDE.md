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
node --check src/systems/aurora.js # pemeriksaan sintaks satu berkas

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

Tiap planet memakai peta permukaan asli di `assets/planets/*.jpg`, dipetakan ke
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

Tiap bintang membawa nama depan, kota, dan satu kalimat — dan ketiganya baru
ada gunanya kalau bisa dibaca. `ui/organisms/star-card.js` menampilkannya:
scene memancarkan `sky-star-hover` (penunjuk) dan `sky-star-open` (ketukan),
keduanya dengan koordinat layar supaya kartunya tahu muncul di sebelah mana.
Dua kejadian, bukan satu, karena layar sentuh tidak punya hover dan bintangnya
terlalu kecil untuk diberi ukuran sentuh yang layak.

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
- **`ctx.glowTexture` adalah pabrik tekstur, bukan tekstur.** Meneruskannya
  langsung sebagai `map` menghasilkan shader yang gagal dikompilasi dengan pesan
  `'uvundefined' : undeclared identifier` — three.js membaca `map.channel` yang
  tidak ada. Panggil sekali di `build()` dan pakai hasilnya bersama-sama.
- **Pendengar `pointerdown` di `window` fase capture melihat SEMUA klik.**
  Termasuk yang jatuh di tombol HUD. Kalau koordinatnya diukur terhadap
  `e.target`, klik di tombol kecil menghasilkan koordinat yang ngawur — periksa
  dulu bahwa targetnya memang kanvas (`star-place.js`).
- **Jangan menggantungkan pengambilan data awal pada kejadian sekali-jalan.**
  `scene-ready` terbit satu kali; modul yang mendengarkannya sedetik terlambat
  tidak pernah mendapat jawaban dan diam-diam menampilkan keadaan yang salah.
  Ambil datanya saat modul dimuat, lalu tunggu scene-nya kalau perlu.

## Rilis

`node build.mjs` menghasilkan `dist/` (bundel terkompresi + `index.html` yang
menunjuk ke sana). **Unggah isi `dist/`, jangan `src/`, dan jangan sampai `.git/`
ikut terunggah.** `DEPLOY.md` memuat alasannya, termasuk penjelasan jujur bahwa
kode klien tidak bisa dibuat tidak-bisa-disalin — yang bisa dilakukan hanya
menaikkan ongkosnya dan memindahkan rahasia ke sisi server.

## Berkas lama

`scene.js` dan `Spatial Indonesia.dc.html` adalah layar versi gulir yang lama;
keduanya tidak dimuat `index.html`. `github.md` adalah catatan sinkronisasi repo
yang sudah usang.

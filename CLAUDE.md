# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Situs tata surya interaktif Spatial Indonesia: three.js + WebXR, dibungkus template
Design Canvas. Komentar kode, teks antarmuka, dan catatan proyek ditulis dalam
Bahasa Indonesia — ikuti kebiasaan itu, dan jelaskan **alasan** sebuah keputusan,
bukan mengulang apa yang sudah terbaca dari kodenya.

## Menjalankan

Tidak ada `package.json`, tidak ada dependensi terpasang, tidak ada test runner.
Berkasnya statis, tapi **harus lewat HTTP** (ES modules + `fetch` tidak jalan dari
`file://`):

```bash
python3 -m http.server 8899        # lalu buka http://localhost:8899/index.html
node build.mjs                     # rakit rilis → dist/ (esbuild diambil via npx)
node --check src/systems/aurora.js # pemeriksaan sintaks satu berkas
```

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
src/data/           fakta tanpa perilaku — ini seam menuju API nanti
src/systems/        fitur 3D yang berdiri sendiri
src/scene/          panggung + pendaftaran sistem
src/ui/             atomic design: atoms → molecules → organisms
src/app/            penyusun (hud.js, ambience.js)
```

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
`agenda` · `sky-lore` / `sky-aim` · `trails` · `aurora` · `milkyway` ·
`meteor-start` / `meteor-armed` / `meteor-end` / `meteor-hit` / `meteor-shot` /
`meteor-hud` / `meteor-over` / `meteor-restart` · `insight-open` / `insight-close` ·
`xr-support` / `xr-end` / `xr-error` · `ar-support` / `ar-start` / `ar-placed`

Elemen `<solar-system>` juga punya API publik yang dipakai HUD:
`travelTo` · `freeFlight` · `setConstellations` / `skyReport` · `setTrails` /
`presenceCount` · `setAurora` · `setMilkyWay` · `setMeteorMode` / `restartMeteor` / `fireAt` ·
`agendaNow` · `systemMap` (data peta orbit + panning audio) · `snapshot`
(kartu pos) · `openArticle` / `closeArticle` · `enterVR` / `enterAR`.

### Urutan impor di `src/main.js` disengaja

Antarmuka dimuat **sebelum** panggung. `customElements.define` memperbarui elemen
seketika, jadi kalau panggung duluan, kejadian pertamanya lewat sebelum ada yang
mendengarkan. Dalam mode berkas terpisah hal ini tersamarkan oleh jeda jaringan;
di bundel rilis ia langsung terasa.

### Lapisan data adalah seam menuju API

`src/data/agenda.js` menyimpan agenda contoh dan `agendaState()`. Satu fungsi itu
menggerakkan empat tempat sekaligus: sudut planet Event di orbit, Titik Temu
beserta busurnya, papan misi, dan kartu Event (juga panel di dalam headset lewat
`data/panels.js`). Saat pindah ke API, ganti isinya dan pertahankan bentuk
kembaliannya — sisi 3D dan UI tidak perlu disentuh.

### UI: atomic design

Tiap komponen membawa CSS-nya sendiri (`export const css`); `ui/styles.js` hanya
menjahit. Menambah komponen berarti menambah berkas dan satu baris di perakit —
jangan menaruh aturan baru di `styles/base.js` kecuali ia benar-benar token atau
penyesuaian tata letak global.

## Jebakan yang sudah pernah menggigit

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

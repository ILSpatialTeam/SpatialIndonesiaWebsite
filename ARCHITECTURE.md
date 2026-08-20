# Arsitektur

Satu kalimat yang menjelaskan seluruh susunan ini:

> **Tidak ada berkas yang boleh tahu lebih banyak daripada yang ia butuhkan.**

```
index.html            halaman (template Design Canvas + isi teks)
support.js            runtime Design Canvas (pihak ketiga)
build.mjs             perakit rilis  →  dist/

src/
  main.js             titik masuk tunggal; urutan impornya disengaja

  core/               perkakas yang tidak tahu apa-apa soal tata surya
    three.js            satu-satunya pintu ke three.js
    bus.js              papan pengumuman antar lapisan
    registry.js         daftar sistem: build / update / dispose
    context.js          konteks sempit yang diterima tiap sistem
    math.js  texture.js  dom.js  audio.js

  data/               fakta, tanpa perilaku
    planets.js          planet, warna, ikon, urutan navigasi
    agenda.js           agenda & jejak pengunjung  ← nanti dari API
    insight.js          artikel & sparing
    panels.js           isi panel headset (dirakit dari dua data di atas)

  systems/            fitur 3D; masing-masing berdiri sendiri
    sky-lore.js         rasi bintang Nusantara
    agenda-orbit.js     orbit sebagai kalender
    trails.js           jejak penjelajah
    aurora.js           tirai cahaya
    milkyway.js         galaksi spiral yang mengelilingi tata surya
    meteor.js           permainan pertahanan

  scene/
    solar-system.js     panggung: renderer, kamera, planet, XR, dan
                        pendaftaran sistem. Tidak memiliki fitur.

  ui/                 atomic design
    atoms/              el.js (pembuat elemen), icon.js
    molecules/          instrument.js, status-orb.js
    organisms/          cluster, signals, nav-rail, info-panel, orrery,
                        hero-board, event-card, postcard, focus-mode,
                        meteor-hud, insight-reader
    styles.js           menjahit CSS milik tiap komponen jadi satu
    styles/base.js      token warna & penyesuaian tata letak

  app/
    hud.js              penyusun antarmuka: membuat tombol, memasang
                        organisme, menyambungkan kejadian
    ambience.js         suara orbit
```

## Atomic design, dan batasnya

Lapisan UI mengikuti Brad Frost dengan jujur:

| Lapisan | Isi | Aturan |
| --- | --- | --- |
| **Atom** | `el`, `icon` | tidak punya keadaan, tidak tahu konteks |
| **Molekul** | tombol instrumen, penanda orbit | menggabung atom, masih tanpa urusan bisnis |
| **Organisme** | gugus instrumen, papan misi, peta orbit, transmisi | punya keadaan sendiri dan CSS-nya sendiri |
| **Template** | `index.html` | tata letak & isi teks |
| **Halaman** | `app/hud.js` | menyusun organisme dan menyambungkan data |

Tiap komponen membawa CSS-nya sendiri lewat `export const css`; `ui/styles.js`
hanya menjahitnya. Menghapus satu organisme berarti menghapus satu berkas —
gayanya ikut terhapus, tidak ada aturan yatim yang tertinggal.

Untuk sisi 3D, atomic design tidak dipaksakan: di sana tidak ada "atom" yang
bermakna. Yang dipakai adalah pemisahan berlapis — data → sistem → panggung.

## SOLID, dan di mana ia terlihat

**S — satu tanggung jawab.** `solar-system.js` dulu 3.374 baris berisi segalanya.
Sekarang ia hanya menyiapkan panggung dan mendaftarkan sistem. Aurora tidak lagi
bertetangga dengan pemuat artikel.

**O — terbuka untuk perluasan.** Loop utama berbunyi `this.systems.update(t, dt)`
— satu baris, tanpa menyebut satu pun nama fitur. Menambah fitur:

```js
// src/systems/nebula.js
export function createNebula(ctx) {
  return { name: 'nebula', build() {…}, update(t, dt) {…} };
}
// src/scene/solar-system.js — satu baris
this.systems.add(createNebula);
```

**L — bisa saling ditukar.** Semua sistem berbentuk sama (`build/update/dispose`),
jadi urutan dan keberadaannya bisa diubah tanpa yang lain peduli.

**I — antarmuka yang sempit.** Sistem tidak menerima scene, melainkan `ctx`:
panggung, dunia, kamera, bus, `bodies` (tanya posisi planet), dan `view` (port
kendali kamera). Sistem meteor tidak bisa menyentuh pemuat artikel meski ingin.

**D — bergantung pada abstraksi.** Tidak ada modul yang menulis alamat CDN
three.js; semuanya lewat `core/three.js`. Tidak ada sistem yang memanggil
`dispatchEvent` pada elemen; semuanya lewat `core/bus.js`. Mengganti three.js
dengan berkas lokal, atau bus dengan sesuatu yang lain, cukup satu berkas.

## Aturan yang dijaga

1. `systems/` tidak boleh menyentuh DOM. `ui/` tidak boleh mengimpor three.js.
   Keduanya bicara lewat bus.
2. Angka dan teks yang bisa berubah tinggal di `data/`, bukan di kode.
3. Tiap komponen UI memiliki CSS-nya sendiri.
4. Urutan impor di `main.js` disengaja: antarmuka dulu, panggung terakhir.

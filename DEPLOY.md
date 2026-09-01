# Rilis & perlindungan kode

## Yang perlu dikatakan lebih dulu

**Kode yang berjalan di browser tidak bisa dibuat tidak-bisa-disalin.** Browser
harus menerima seluruh kode untuk menjalankannya, dan siapa pun bisa membuka
tab jaringan lalu menyimpannya. Ini bukan kekurangan situs ini — begitulah cara
web bekerja, dan berlaku untuk semua situs, termasuk yang dibuat perusahaan
besar.

Yang bisa dilakukan adalah **menaikkan ongkos menyalin** dan **memindahkan yang
benar-benar berharga ke tempat yang tidak dikirim ke browser**. Itu yang
dikerjakan di bawah ini.

Beberapa hal yang **sengaja tidak** dipakai, dan alasannya:

- **Mematikan klik kanan / DevTools.** Dilewati dalam sepuluh detik (buka lewat
  menu, atau `view-source:`), sementara ia mengganggu pengguna biasa dan alat
  bantu aksesibilitas. Efeknya negatif bersih.
- **Obfuscator agresif** (pengacak alur, string terenkripsi). Memperlambat
  eksekusi, memperbesar berkas, menyulitkan pelacakan galat dari pengguna asli
   — dan tetap bisa dipulihkan dengan alat gratis.
- **Deteksi DevTools lalu blokir halaman.** Sering salah tuduh, dan pemasangan
  ekstensi apa pun bisa memicunya.

## Yang dilakukan

### 1. Rakit sebelum unggah

```bash
node build.mjs      # menghasilkan folder dist/
```

Yang keluar: satu bundel `app.js` dengan nama variabel diringkas, komentar
dibuang, dan seluruh struktur berkas hilang — 400 KB sumber jadi ±207 KB. Yang
membacanya tidak melihat `createAurora` atau `SKY_LAT`, melainkan `Qn`, `ea`,
`t`. Struktur modul, nama fungsi, dan komentar Bahasa Indonesia yang menjelaskan
alasan tiap keputusan — semuanya tidak ikut terkirim.

**Unggah isi `dist/`, jangan folder `src/`.** Kalau `src/` ikut terunggah,
seluruh pekerjaan ini sia-sia.

### 2. Jangan kirim yang tidak perlu

Berkas berikut tidak boleh ikut ke server produksi:

- `src/` — sumber yang enak dibaca
- `build.mjs`, `ARCHITECTURE.md`, `DEPLOY.md`, `github.md`
- `Spatial Indonesia.dc.html`, `.thumbnail` — berkas kerja Design Canvas
- `.git/` — **ini yang paling sering terlupa**; kalau folder `.git` ikut
  terunggah, seluruh riwayat kode bisa diunduh utuh oleh siapa pun

Uji setelah rilis: buka `https://situs-kamu/.git/config` dan
`https://situs-kamu/src/main.js`. Keduanya harus 404.

### 2b. Umur cache di `vercel.json`

`vercel.json` tidak bisa memuat komentar, jadi alasannya ditulis di sini.

Bawaan Vercel untuk berkas statis adalah `max-age=0, must-revalidate`: tiap
kunjungan berikutnya tetap bertanya ke server, dan Lighthouse menandainya
sebagai kebijakan cache yang tidak efisien. Blok `headers` menaikkannya, tapi
**tidak untuk semuanya** — dan pembagiannya disengaja:

- `assets/planets/`, `assets/icons/`, `sounds/` → satu tahun, `immutable`.
  Isinya tidak pernah berubah tanpa berganti nama. Konsekuensinya harus
  diterima: mengganti tekstur berarti mengganti nama berkasnya, bukan menimpa
  yang lama.
- Lambang dan `og-cover` → tujuh hari dengan `stale-while-revalidate`. Keduanya
  sesekali diperbarui, dan menunggu sepekan untuk itu masih wajar.
- `index.html`, `app.js`, `support.js` → **sengaja dibiarkan pada bawaan
  Vercel.** Ketiganya berubah tiap rilis dan namanya tidak mengandung hash.
  Menyimpannya lama berarti pengunjung bisa menjalankan bundel lama di atas
  halaman baru — jenis kerusakan yang hanya muncul di sebagian orang dan tidak
  bisa direproduksi di mesin sendiri.

### 3. Simpan yang berharga di sisi server

Ini satu-satunya perlindungan yang sungguh-sungguh. Saat data pindah ke API
nanti (lihat `src/data/agenda.js`):

- kunci API, token, dan kredensial **tidak boleh** ada di kode klien — sekali
  terkirim ke browser, ia milik publik;
- logika yang benar-benar rahasia dijalankan di server, klien hanya menerima
  hasilnya;
- endpoint dibatasi dengan CORS dan rate limit, karena orang lain bisa
  memanggilnya dari situs mereka sendiri.

### 4. Tanda kepemilikan

Bundel membawa baris hak cipta yang tidak ikut terbuang saat diperkecil:

```
/*! Spatial Indonesia — © 2026. Seluruh hak cipta dilindungi. */
```

Ini bukan penghalang teknis, melainkan bukti. Kalau suatu hari ada situs lain
yang tampil serupa, yang menentukan bukan seberapa sulit kodenya dibaca,
melainkan bukti kepemilikan dan surat dari kuasa hukum.

Pertimbangkan juga menambahkan berkas `LICENSE` yang menyatakan hak cipta
tertutup, supaya tidak ada anggapan kode ini bebas dipakai.

## Ringkasnya

| Tujuan | Bisa? | Caranya |
| --- | --- | --- |
| Kode tidak bisa dibaca sama sekali | ❌ | tidak mungkin di web |
| Menyalin jadi mahal dan tidak menarik | ✅ | `node build.mjs`, unggah `dist/` |
| Struktur & niat kode tidak ikut bocor | ✅ | bundel tanpa komentar & nama asli |
| Rahasia (kunci, logika bisnis) aman | ✅ | taruh di server, bukan di klien |
| Punya bukti saat kode dicuri | ✅ | baris hak cipta + `LICENSE` |

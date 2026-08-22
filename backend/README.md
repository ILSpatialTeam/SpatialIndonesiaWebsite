# Backend Spatial Indonesia

REST API + dashboard admin untuk situs tata surya interaktif Spatial Indonesia.
Node.js + Express + PostgreSQL, tanpa ORM, tanpa langkah build.

Frontend tetap terpisah di folder induk (`../src`, `../index.html`) dan hanya
bicara dengan backend ini lewat HTTP. Folder ini bisa dipindah ke repositori
sendiri tanpa mengubah satu baris pun.

## Dokumentasi

| Berkas | Isi |
| --- | --- |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Bentuk lapisan, keputusan rancangan, dan alasannya |
| [`DEVELOPMENT.md`](DEVELOPMENT.md) | Cara menyiapkan, menambah fitur, menguji, dan jebakan yang sudah pernah menggigit |
| [`SECURITY.md`](SECURITY.md) | Hasil audit keamanan beserta cara menjalankannya ulang |
| [`DEPLOYMENT.md`](DEPLOYMENT.md) | Menaikkan ke produksi: Docker, systemd, reverse proxy, cadangan |
| `/docs` | Referensi REST API (Swagger), bisa dicoba langsung |

```
http://localhost:4000/api/v1   REST API
http://localhost:4000/docs     Dokumentasi Swagger
http://localhost:4000/admin    Dashboard admin
```

## Menjalankan

Butuh Node 20+ dan PostgreSQL 13+.

```bash
cp .env.example .env          # lalu isi DATABASE_URL dan dua JWT secret
npm install
npm run migrate               # bangun skema
npm run seed                  # isi konten awal + akun admin pertama
npm run dev                   # atau: npm start
```

Bangkitkan rahasia JWT dengan:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Perintah lain

| Perintah                 | Gunanya                                                        |
| ------------------------ | -------------------------------------------------------------- |
| `npm run migrate:status`  | Daftar migrasi: mana yang sudah jalan, mana yang berkasnya berubah |
| `npm run migrate:down`    | Batalkan **satu** migrasi terakhir                              |
| `npm run db:reset`        | Turunkan semua, naikkan lagi, isi ulang (dilarang di produksi)  |
| `npm run admin:create`    | `-- <email> <nama> <kata-sandi> [owner\|editor]`                |
| `npm run schema:dump`     | Rakit ulang `db/schema.sql` dari migrasi                        |
| `npm test`                | 94 tes: unit (tanpa DB) + integrasi (database uji sungguhan)    |
| `npm run test:unit`       | Hanya unit — cepat, tanpa Postgres                              |

## Database

Dua berkas SQL, dua kegunaan berbeda:

- **`db/migrations/*.sql`** — sejarahnya. Satu berkas per perubahan, dipisah
  penanda `-- migrate:up` / `-- migrate:down`, dijalankan berurutan dan dicatat
  di tabel `schema_migrations`. Ini yang dipakai untuk database yang sudah ada.
- **`db/schema.sql`** — keadaan sekarang dalam satu berkas. Untuk memasang dari
  nol tanpa memutar ulang setiap langkah. Dibangkitkan, jangan disunting tangan.
- **`db/seed.sql`** — isi awal (tujuh menu, enam artikel, agenda, sparing).
  Aman diulang; tidak menyentuh akun admin maupun kiriman pengunjung.

Pasang dari nol tanpa Node:

```bash
createdb spatial_indonesia
psql "$DATABASE_URL" -f db/schema.sql
psql "$DATABASE_URL" -f db/seed.sql
```

Migrasi yang **sudah dijalankan tidak boleh disunting** — checksum-nya dicatat,
dan menyuntingnya akan ditolak saat migrasi berikutnya. Buat berkas baru.

## Bentuk kode

```
src/
├── domain/          entitas + kontrak repositori (abstrak). Tanpa I/O.
├── application/     use case. Tahu aturan bisnis, tidak tahu HTTP atau SQL.
│   ├── ports.js         antarmuka keluar (hasher, token)
│   └── services/
├── infrastructure/  yang menyentuh dunia luar
│   ├── db/              pool, migrator
│   ├── repositories/    implementasi Postgres dari kontrak domain
│   ├── security/        bcrypt, JWT
│   └── cache/
├── interfaces/http/ Express: rute, controller, middleware, skema, OpenAPI
├── shared/          galat, log, sanitasi HTML, slug
├── container.js     composition root — satu-satunya yang merakit semuanya
└── app.js           susunan middleware Express
```

Arah ketergantungannya selalu ke dalam: `interfaces` → `application` →
`domain`. `domain` tidak mengimpor apa pun dari luar dirinya, dan `application`
tidak pernah mengimpor `pg` — ia menerima repositori lewat konstruktor. Yang
didapat dari itu bukan kemurnian teori: mengganti Postgres dengan repositori
palsu untuk pengujian cukup mengubah `container.js`.

## Keamanan

| Lapis                | Cara                                                                 |
| -------------------- | -------------------------------------------------------------------- |
| Header               | helmet + CSP ketat (tanpa satu pun host luar; Quill dilayani lokal)   |
| CORS                 | daftar putih origin, bukan pantulan; `credentials` menyala            |
| Sesi                 | JWT 15 menit di cookie httpOnly + refresh token yang bisa dicabut     |
| Rotasi               | tiap refresh mencabut sesi lama — token curian mati saat pemilik refresh |
| CSRF                 | double submit; wajib untuk semua tulisan lewat cookie                 |
| Kata sandi           | bcrypt 12 putaran; login setara-waktu walau akunnya tidak ada         |
| Injeksi SQL          | seluruh query berparameter, tanpa perangkaian string                  |
| XSS                  | HTML editor disanitasi **saat simpan**, allowlist tag sempit          |
| Pembatas laju        | baca 300/mnt · login 10/15mnt · kiriman publik 8/10mnt                |
| Unggahan             | 4 MB, allowlist MIME, nama berkas dibangkitkan server                 |
| Privasi              | IP disimpan sebagai hash bergaram, tidak pernah mentah                |
| Jejak                | setiap perubahan admin tercatat di `audit_logs`                       |

Sebelum produksi: ganti kedua JWT secret, setel `COOKIE_SECURE=true` (proses
menolak jalan kalau tidak), dan isi `CORS_ORIGINS` dengan domain frontend saja.

## Performa

- `GET /bootstrap` membawa seluruh isi situs dalam satu respons — frontend tidak
  menunggu tujuh permintaan sebelum tata suryanya benar.
- Cache di memori bertag, dibatalkan otomatis di setiap tulisan admin.
- ETag pada endpoint publik: kunjungan berikutnya berakhir 304 tanpa badan
  (13,7 KB → 0 byte).
- gzip (13,7 KB → 5,2 KB).
- Menu + butir + tautan diambil satu query lewat agregasi JSON, bukan N+1.
- Daftar artikel tidak membawa isi tulisan; isinya diambil saat dibuka.
- Indeks parsial untuk artikel terbit, sparing disetujui, dan agenda tampil.

## Integrasi dengan frontend

Frontend membaca `<meta name="spatial-api">` di `../index.html`. Ubah isinya ke
domain backend saat rilis, atau hapus metanya kalau API dilayani dari origin
yang sama.

Alurnya ada di `../src/data/remote.js`: snapshot localStorage diterapkan
**sinkron** sebelum panggung dibangun, lalu data terbaru diambil di belakang
layar. Kalau backend mati, situsnya tetap utuh dengan data bawaan — yang hilang
cuma kemutakhirannya.

# Panduan Pengembangan — Backend Spatial Indonesia

Untuk orang yang akan menyentuh kode ini, termasuk diri sendiri enam bulan lagi.
Arsitektur dan alasannya ada di [`ARCHITECTURE.md`](ARCHITECTURE.md); hasil
audit keamanan di [`SECURITY.md`](SECURITY.md).

---

## 1. Menyiapkan dari nol

```bash
brew services start postgresql@18        # atau layanan Postgres apa pun

createdb spatial_indonesia
psql -d postgres -c "CREATE ROLE spatial_app LOGIN PASSWORD 'ganti-ini';"
psql -d postgres -c "ALTER DATABASE spatial_indonesia OWNER TO spatial_app;"

cd backend
cp .env.example .env                     # isi DATABASE_URL + dua JWT secret
npm install
npm run migrate                          # skema
npm run seed                             # isi awal + akun admin pertama
npm run dev
```

Bangkitkan rahasia:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Tiga alamat setelah jalan:

| | |
|---|---|
| `http://localhost:4000/api/v1` | REST API |
| `http://localhost:4000/docs` | Swagger, bisa dicoba langsung |
| `http://localhost:4000/admin` | Dashboard |

Frontend dijalankan terpisah dari folder induk (`python3 -m http.server 8899`,
Live Server, atau server statis apa pun). Port frontend **harus ada di
`CORS_ORIGINS`**, kalau tidak `/bootstrap` ditolak 403.

## 2. Perintah

| Perintah | Gunanya |
|---|---|
| `npm run dev` | Jalan dengan `--watch`, restart tiap berkas berubah |
| `npm start` | Tanpa watch |
| `npm run migrate` | Jalankan migrasi yang belum terpasang |
| `npm run migrate:status` | Mana yang sudah jalan · `!` = berkasnya berubah setelah terpasang |
| `npm run migrate:down` | Batalkan **satu** migrasi terakhir |
| `npm run db:reset` | Turunkan semua → naikkan → isi ulang (ditolak di produksi) |
| `npm run seed` | Isi konten awal, aman diulang |
| `npm run admin:create` | `-- <email> <nama> <sandi> [owner\|editor]` |
| `npm run schema:dump` | Rakit ulang `db/schema.sql` dari migrasi |

## 3. Bekerja dengan migrasi

Satu berkas per perubahan, dinamai `000N_topik.sql`:

```sql
-- 0006_contoh.sql — satu kalimat yang menjelaskan KENAPA, bukan apa.

-- migrate:up
CREATE TABLE contoh ( … );

-- migrate:down
DROP TABLE IF EXISTS contoh;
```

Aturan yang berlaku tanpa kecuali:

- **Jangan pernah menyunting migrasi yang sudah dijalankan.** Checksum-nya
  dicatat; menyuntingnya membuat `npm run migrate` menolak jalan dengan pesan
  yang menyuruh membuat migrasi baru. Itu bukan gangguan — itu yang mencegah
  database dua orang berbeda padahal versinya sama.
- **Selalu tulis bagian `down`.** Kalaupun isinya cuma `DROP TABLE`.
- **Jalankan `npm run schema:dump` setelahnya**, supaya `db/schema.sql` tetap
  mencerminkan keadaan sekarang.

Kalau perlu mengganti data seed, jangan sunting `db/seed.sql` — ia dibangkitkan.
Ubah `scripts/generate-seed.mjs` lalu jalankan `node scripts/generate-seed.mjs`.

## 4. Menambah sesuatu

### Endpoint publik baru

1. Method baru di `application/services/content.service.js`
2. Handler di `interfaces/http/controllers/public.controller.js` — **tipis**,
   tanpa aturan bisnis
3. Rute di `routes/public.routes.js`, lengkap dengan skema validasi dan umur
   cache (`publicCache(detik)` atau `noStore`)
4. Path di `interfaces/http/openapi/index.js`

### Tabel baru

1. Migrasi (lihat §3)
2. Kontrak di `domain/repositories/contract.js`
3. Implementasi di `infrastructure/repositories/nama.pg.js`
4. Daftarkan di `src/container.js`

### Aturan bisnis baru

Tempatnya di `application/services/`, bukan di controller dan bukan di
repository. Uji cepatnya: kalau aturan itu harus tetap berlaku saat dipanggil
dari skrip CLI, ia bukan urusan HTTP.

## 5. Kebiasaan yang dipegang

**Bahasa.** Komentar, nama variabel domain, dan pesan galat ditulis dalam
Bahasa Indonesia — mengikuti proyek induknya. Nama teknis yang sudah baku
(`repository`, `middleware`, `cache`) dibiarkan.

**Komentar menjelaskan alasan, bukan isi.** `// ambil pengguna` di atas
`getUser()` tidak menambah apa pun. Yang layak ditulis adalah kenapa
`decay: 0.9` dan bukan `2`, kenapa cache dibatalkan bertag, kenapa migrasi
tidak boleh disunting.

**Controller tipis, service tebal, repository bodoh.** Controller
menerjemahkan HTTP. Service memutuskan. Repository hanya tahu SQL.

**Galat dilempar, bukan dikembalikan.** `throw new NotFoundError('Artikel')`.
Middleware yang menerjemahkannya ke HTTP.

**Validasi di tepi, aturan bisnis di dalam.** Zod memeriksa *bentuk* di
`schemas/`; service memeriksa *aturan* (kategori ada? orbit bertabrakan?).
Yang lolos ke service sudah pasti berbentuk benar.

> Perhatian yang pernah menggigit: kalau sebuah nilai disanitasi di service,
> validasi panjangnya harus **diulang setelah sanitasi**. `<img src=x>`
> panjangnya 12 karakter dan lolos Zod, tapi jadi string kosong setelah tagnya
> dibuang. Lihat T-2 di `SECURITY.md`.

## 6. Menguji

```bash
npm test          # 94 tes: unit + integrasi
npm run test:unit # hanya unit — cepat, tanpa Postgres
```

Memakai test runner bawaan Node (`node --test`), tanpa kerangka kerja tambahan.

```
test/
├── unit/          murni, tanpa I/O — sanitizer, diff, slug, agenda, cache,
│                  dan aturan bisnis service (dengan repositori palsu)
├── integration/   aplikasi sungguhan + database sungguhan + HTTP sungguhan
└── helpers/       harness server dan repositori palsu
```

Tes integrasi memakai database terpisah (`spatial_indonesia_test`) yang
dikosongkan sebelum setiap tes. Peran aplikasi sengaja tidak berhak membuat
database, jadi buat sekali sebagai superuser:

```bash
createdb -O spatial_app spatial_indonesia_test
```

Repositori palsu di `test/helpers/fakes.js` **harus menghormati kontrak yang
sama dengan yang asli** — repositori Postgres mengembalikan baris database
(snake_case), bukan objek yang dikirim ke dalamnya. Palsu yang mengembalikan
bentuk berbeda membuat tes lulus terhadap sesuatu yang tidak pernah ada di
produksi, dan itu lebih buruk daripada tidak punya tes sama sekali.

Pemeriksaan sintaks cepat tanpa menjalankan apa pun:

```bash
find src scripts admin -name '*.js' -exec node --check {} \;
```

**Uji perilaku lewat HTTP.** Cara tercepat adalah Swagger di `/docs` — tekan
*Authorize*, tempel `accessToken` dari respons login sebagai `bearerAuth`
(jalur Bearer tidak butuh CSRF), lalu coba endpointnya langsung.

Untuk skrip:

```bash
API=localhost:4000/api/v1
T=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
     -d '{"email":"…","password":"…"}' | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')
curl -s -H "Authorization: Bearer $T" $API/admin/articles | head -c 400
```

**Uji dashboard tanpa login berulang.** Modul admin bisa dimuat ulang dengan
`fetch` yang di-mock dari konsol DevTools — berguna untuk memeriksa tampilan
tanpa menyiapkan data:

```js
const asli = window.fetch;
const J = (d) => new Response(JSON.stringify(d), { headers: { 'Content-Type': 'application/json' } });
window.fetch = async (u, o) => String(u).includes('/auth/me')
  ? J({ id: 'x', email: 'a@b.c', name: 'Uji', role: 'owner' })
  : asli(u, o);
document.querySelector('#akar').replaceChildren();
await import('/admin/js/app.js?p=' + Date.now());
```

> **Modul ES di-cache per URL, dan itu akan menipu Anda.** Query `?p=…` hanya
> membusukkan `app.js`; impor statisnya (`./ui.js`, `./views/*.js`) tetap
> diambil dari peta modul tab tersebut. `fetch(url, { cache: 'reload' })` diikuti
> `location.reload()` pun tidak selalu cukup.
>
> Gejalanya menyesatkan: sebagian perubahan terlihat, sebagian tidak — sehingga
> tampak seperti bug logika padahal dua versi modul sedang bercampur. Kalau ada
> perilaku yang tidak masuk akal setelah menyunting `admin/js/`, **buka tab
> baru** sebelum mencari penyebab lain. Peta modul tab baru selalu kosong.

**Sebelum rilis:**

```bash
npm audit --omit=dev
npm run migrate:status                   # tidak boleh ada tanda !
curl -s $API/health
```

## 7. Jebakan yang sudah pernah menggigit

- **CORS bisa gagal tanpa satu pun galat di konsol.** Header di luar daftar aman
  CORS — `If-None-Match` salah satunya — memicu preflight. Kalau tidak ada di
  `allowedHeaders`, preflight-nya **berhasil** (204) tapi permintaan sebenarnya
  dibatalkan browser diam-diam. Yang menunjukkannya cuma log server: `OPTIONS`
  tanpa `GET` sesudahnya.
- **Skrip `type="module"` membawa header `Origin` walau same-origin.** Daftar
  putih yang tidak memuat origin server sendiri akan menolak modul
  dashboard-nya sendiri.
- **Properti instans menutupi method prototipe.** `this.taxonomy = repo` di
  konstruktor membuat method `taxonomy()` di kelas yang sama tidak akan pernah
  terpanggil. Sudah kejadian dua kali di `application/services/`.
- **Ekspresi indeks harus IMMUTABLE.** `(created_at::date)` ditolak Postgres
  karena hasilnya bergantung zona waktu sesi.
- **`Object.assign(style, {'--x': v})` diabaikan diam-diam.** Custom property
  hanya bisa disetel lewat `setProperty()`.
- **`induk.append(null)` menulis teks "null" ke halaman.** Pakai `pasang()`
  dari `admin/js/ui.js`, yang menyaringnya.
- **Atribut `hidden` kalah oleh `display` apa pun dari kelas.** Ditutup global
  dengan `[hidden] { display: none !important }`.
- **`MutationObserver` yang mengamati subtree lalu mengubahnya akan memakan
  dirinya sendiri.** Lepas pengawasnya selama menggambar.

## 8. Menyiapkan produksi

Daftar lengkapnya di [`SECURITY.md` §4](SECURITY.md). Ringkasnya: ganti kedua
JWT secret, ganti kata sandi admin dan role Postgres, setel `COOKIE_SECURE=true`,
isi `CORS_ORIGINS` hanya dengan domain frontend, pasang HTTPS, dan sesuaikan
`app.set('trust proxy', …)` dengan jumlah proxy yang benar-benar ada di depan.

Proses menolak jalan kalau JWT secret masih nilai contoh atau
`COOKIE_SECURE=false` saat `NODE_ENV=production` — dua kesalahan yang paling
sering lolos ke produksi, jadi keduanya dibuat mustahil.

Backup: `pg_dump` seluruh database. Tidak ada state di luar Postgres kecuali
berkas di `uploads/`, yang harus ikut dicadangkan.

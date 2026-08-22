# Arsitektur Backend Spatial Indonesia

Node.js + Express + PostgreSQL. Tanpa ORM, tanpa langkah build, tanpa kerangka
kerja di sisi dashboard. Dokumen ini menjelaskan **kenapa** bentuknya begini —
apa yang sudah ada bisa dibaca dari kodenya.

---

## 1. Bentuk besarnya

```
                    ┌──────────────────────────────────────┐
   Pengunjung ─────▶│  interfaces/http                     │
   (situs 3D)       │  rute · controller · middleware      │
                    │  validasi (zod) · OpenAPI            │
   Admin ──────────▶└───────────────┬──────────────────────┘
   (dashboard)                      │  memanggil, tidak pernah dipanggil
                                    ▼
                    ┌──────────────────────────────────────┐
                    │  application                         │
                    │  service = satu kasus penggunaan     │
                    │  ports.js = antarmuka keluar         │
                    └───────┬──────────────────────┬───────┘
                            │                      │
                            ▼                      ▼
              ┌──────────────────────┐  ┌────────────────────────┐
              │  domain              │  │  infrastructure        │
              │  entitas + kontrak   │◀─│  pg · bcrypt · jwt     │
              │  repositori (abstrak)│  │  cache · multer        │
              │  TANPA I/O           │  │  MENGIMPLEMENTASI      │
              └──────────────────────┘  │  kontrak domain        │
                                        └────────────────────────┘
                                                   │
                                                   ▼
                                            PostgreSQL
```

Panah ketergantungan **selalu menunjuk ke dalam**. `domain/` tidak mengimpor
apa pun dari lapisan lain. `application/` tidak pernah mengimpor `pg`,
`express`, `bcrypt`, atau `jsonwebtoken` — ia menerima semuanya lewat
konstruktor.

Satu-satunya berkas yang tahu semua lapisan sekaligus adalah **`src/container.js`**.

### Kenapa repotnya sepadan

Bukan kemurnian teori. Tiga hal konkret:

1. **Menguji tanpa database.** Ganti isi `container.js` dengan repositori
   palsu, dan seluruh aturan bisnis bisa diuji tanpa Postgres menyala.
2. **Pertanyaan "siapa memakai apa" punya satu jawaban.** Semua perakitan ada
   di satu layar, bukan tersebar sebagai `import` di lima puluh berkas.
3. **Daftar method di kontrak adalah rem.** Begitu sebuah service butuh
   sepuluh method dari repositori, itu tanda ia mengambil terlalu banyak
   urusan — dan tandanya muncul di `domain/repositories/contract.js`, tempat
   yang pasti dibaca.

---

## 2. Lapisan satu per satu

### `domain/` — fakta dan aturan, tanpa I/O

```
entities/     menu.js · article.js · agenda.js · presence.js
repositories/ contract.js
```

Entitas di sini bukan kelas ber-ORM. Isinya fungsi murni: pemeta baris database
ke bentuk yang dipakai frontend, dan aturan yang tidak boleh berbeda antar
pemanggil.

Contoh yang menjelaskan alasannya — `article.js`:

```js
export const isFresh = (publishedAt, freshDays = 30) => { … };
```

"Baru" bukan kolom, melainkan fungsi dari tanggal terbit. Disimpan sebagai
kolom, ia akan basi diam-diam: artikel bulan lalu tetap menyala "baru" sampai
ada yang ingat mematikannya.

`repositories/contract.js` berisi kelas abstrak yang setiap methodnya melempar.
JavaScript tidak punya `interface`; ini penggantinya. Antarmukanya **dipecah
per agregat**, bukan satu `Repository` raksasa — service artikel tidak
seharusnya kenal method sesi admin.

### `application/` — kasus penggunaan

Satu service = satu kelompok pekerjaan yang punya alasan berubah yang sama.

| Service | Tanggung jawab |
|---|---|
| `content` | Baca-saja untuk situs. Pemilik endpoint `/bootstrap`. |
| `participation` | Kiriman pengunjung: sparing, jejak kunjungan, formulir Gabung. |
| `auth` | Login, rotasi sesi, ganti kata sandi. |
| `article-admin` | Penulisan artikel, termasuk gerbang sanitasi HTML. |
| `menu-admin` | Tujuh menu + parameter orbitnya. |
| `curation` | Agenda, moderasi, pendaftaran, taksonomi, pengaturan. |
| `user-admin` | Akun admin. |
| `media` | Berkas unggahan. |
| `monitoring` | Kejadian keamanan, kesehatan database, jejak. |

`ports.js` mendeklarasikan apa yang dibutuhkan lapisan ini dari dunia luar:
`PasswordHasher`, `TokenService`, `Clock`. Service butuh "sesuatu yang bisa
mengaduk kata sandi", bukan bcrypt. Bedanya terasa saat bcrypt diganti argon2:
yang berubah satu berkas di `infrastructure/`, dan tidak ada service yang perlu
dibuka.

**Aturan yang dijaga:** service melempar `NotFoundError`, bukan memanggil
`res.status(404)`. Itu yang membuat lapisan ini bisa dipakai dari CLI, worker,
atau GraphQL tanpa disentuh.

### `infrastructure/` — yang menyentuh dunia

```
db/            pool.js · migrator.js
repositories/  *.pg.js — implementasi kontrak domain
security/      hashing.js (bcrypt) · tokens.js (jwt)
cache/         memory-cache.js
```

Query SQL ditulis eksplisit. Tidak ada ORM, dan itu keputusan sadar: skema ini
punya beberapa kueri yang memang perlu ditulis tangan (agregasi JSON untuk menu,
`generate_series` untuk deret grafik, katalog sistem untuk kesehatan database),
dan ORM akan jadi lapisan yang harus dilawan, bukan dipakai.

### `interfaces/http/` — Express

```
router.js      merakit tiga kelompok rute
routes/        public · auth · admin
controllers/   tipis: HTTP → service → HTTP
middleware/    auth · csrf · validate · error · rate-limit · cache · async
schemas/       zod, satu berkas
openapi/       dokumen Swagger, ditulis tangan
```

Controller sengaja tidak punya satu pun `try/catch` dan tidak satu pun aturan
bisnis. Galat naik ke `middleware/error.js` lewat pembungkus `ah()`.

---

## 3. Keputusan yang perlu diketahui sebelum menyentuh apa pun

### `/bootstrap` — satu panggilan untuk seluruh isi situs

Frontend membutuhkan tujuh hal sekaligus sebelum bisa menggambar tata surya
yang benar: planet, panel, kategori, frekuensi, artikel, agenda, sparing. Tujuh
permintaan HTTP berarti tujuh kali latensi jaringan sebelum tampilannya betul.

**Jejak kehadiran sengaja TIDAK ikut.** Isinya berubah setiap ada pengunjung,
jadi menggabungkannya membuat seluruh muatan itu tidak bisa di-cache. Ia diambil
terpisah dan boleh datang belakangan.

### Cache di memori dengan pembatalan bertag

`infrastructure/cache/memory-cache.js`. Bukan Redis: ini satu proses, datanya
muat di memori, dan boleh hilang kapan saja. Menambah satu layanan untuk dijaga
demi cache sebesar ini tidak dibayar kembali.

Pembatalannya **bertag, bukan berkunci**: satu perubahan artikel membatalkan
`bootstrap`, daftar artikel, dan sparing sekaligus. Menyebut kuncinya satu per
satu pasti ada yang terlewat.

> Kalau backend nanti dijalankan lebih dari satu instans, kelas inilah yang
> diganti Redis. Pemanggilnya tidak berubah — antarmukanya cuma
> `get`/`set`/`wrap`/`invalidate`.

### Dua tabel jejak, bukan satu

| Tabel | Isi | Sifat |
|---|---|---|
| `audit_logs` | Apa yang **dilakukan** admin, beserta medan yang berubah | Tumbuh pelan, disimpan selamanya |
| `security_events` | Apa yang **terjadi** pada sistem: penolakan, kegagalan, galat | Bisa membanjir saat diserang, dibersihkan setelah 90 hari |

Menggabungkannya akan membuat satu serangan brute force menenggelamkan seluruh
riwayat penyuntingan artikel.

### Sanitasi HTML saat simpan, bukan saat tampil

`shared/html.js` adalah gerbang tunggal. Tidak ada HTML dari editor yang masuk
database tanpa lewat sana.

Kalau disanitasi saat tampil, satu jalur render yang lupa memanggilnya sudah
cukup jadi lubang XSS. Menyimpan yang sudah bersih membuat kesalahan itu tidak
mungkin terjadi.

Konsekuensinya: `stripTags()` untuk judul dan lead **mengembalikan entitas HTML
jadi karakter biasa** (`&amp;` → `&`), karena nilai itu dirender lewat
`textContent`. Untuk isi artikel, entitas justru dipertahankan — hasilnya
memang HTML.

### Migrasi adalah sejarah, `schema.sql` adalah keadaan

- `db/migrations/*.sql` — satu berkas per perubahan, dipisah penanda
  `-- migrate:up` / `-- migrate:down`, checksum-nya dicatat.
- `db/schema.sql` — semuanya digabung, untuk memasang dari nol. Dibangkitkan.
- `db/seed.sql` — isi awal. Dibangkitkan dari modul data frontend.

**Migrasi yang sudah dijalankan tidak boleh disunting.** Checksum-nya dicatat,
dan menyuntingnya membuat `npm run migrate` berikutnya menolak jalan. Itu
disengaja: migrasi yang berubah setelah terpasang membuat database dua orang
berbeda padahal versinya sama.

### Pencatatan tidak boleh menggagalkan permintaan

`MonitoringService.catat()` tidak pernah melempar dan tidak pernah ditunggu.
Kalau tabel `security_events` penuh atau Postgres sibuk, pengunjung situs tidak
boleh melihat galat 500 gara-gara sistem pemantauannya sendiri.

Pola yang sama dipakai `articles.incrementView()`: pembaca tidak menunggu satu
UPDATE selesai untuk melihat tulisannya.

---

## 4. Alur satu permintaan

`PATCH /api/v1/admin/menus/program`

```
1  helmet          header keamanan
2  cors            origin diperiksa terhadap daftar putih
3  express.json    badan diurai, dibatasi 1 MB
4  noStore         Cache-Control: no-store
5  requireAuth     JWT diverifikasi → req.actor
6  csrfGuard       header X-CSRF-Token dicocokkan dengan cookie
7  limitTulisAdmin 120/menit
8  validate        zod: params + body; field tak dikenal dibuang
9  controller      req → menuAdmin.update(id, body, actor)
10 service         sanitasi HTML · periksa tabrakan orbit · hitung diff
11 repository      UPDATE berparameter
12 service         batalkan cache bertag · catat audit dengan diff
13 controller      res.json(hasil)
```

Kalau ada yang melempar di langkah mana pun, `ah()` menangkapnya dan
`errorHandler` menerjemahkannya — sekaligus mencatat kejadian keamanan kalau
kodenya termasuk yang dipantau.

---

## 5. Menambah fitur

**Endpoint baca baru:**
1. Method di `ContentService`
2. Handler di `public.controller.js`
3. Rute + skema + umur cache di `public.routes.js`
4. Path di `openapi/index.js`

**Tabel baru:**
1. `db/migrations/000N_nama.sql` dengan bagian `up` **dan** `down`
2. Kontrak di `domain/repositories/contract.js`
3. Implementasi `*.pg.js`
4. Daftarkan di `container.js`
5. `npm run migrate && npm run schema:dump`

**Menyentuh data yang dipakai frontend:** perhatikan bentuk kembalian
`/bootstrap`. Frontend memetakannya langsung ke modul `src/data/*` lewat
`src/data/remote.js`; mengubah nama field di sini memutus sisi 3D-nya.

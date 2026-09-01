// Perakit rilis.
//
// Yang dikirim ke pengunjung bukan berkas sumber, melainkan satu bundel yang
// sudah dipendekkan: nama variabel diringkas, komentar dibuang, ruang kosong
// hilang. Berkas sumber tetap enak dibaca; yang dibaca browser tidak.
//
// Catatan jujur — ini menaikkan ongkos menyalin, bukan mencegahnya. Apa pun
// yang berjalan di browser harus dikirim ke browser. Lihat DEPLOY.md.
//
//   node build.mjs
//
// esbuild diambil lewat npx saat dibutuhkan, jadi proyek ini tetap tanpa
// node_modules dan tanpa package.json.
import { execFileSync } from 'node:child_process';
import { mkdir, cp, readFile, writeFile, rm, stat } from 'node:fs/promises';

// ── .env ────────────────────────────────────────────────────────────────────
// Membaca .env di root frontend supaya konfigurasi deployment (alamat API,
// judul situs) tidak perlu disunting langsung di index.html.
const envVars = {};
try {
  const raw = await readFile('.env', 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    envVars[key] = val;
  }
  console.log('.env terbaca:', Object.keys(envVars).join(', ') || '(kosong)');
} catch { /* .env tidak ada — pakai nilai bawaan di index.html */ }

// ── penjaga: backtick nyasar di dalam CSS milik komponen ────────────────────
//
// Modul UI menyimpan CSS-nya sebagai template literal. Satu backtick di dalam
// komentar CSS — biasanya karena menyebut nama properti dalam prosa Bahasa
// Indonesia — menutup template itu lebih awal, dan sisa berkasnya jadi omong
// kosong. `node --check` meloloskannya karena ia membaca berkas sebagai skrip.
//
// esbuild memang menangkapnya, tapi pesannya menunjuk kata di tengah kalimat
// ("Expected ; but found clamp") dan tidak menyebut sebabnya sama sekali.
// Pemeriksaan ini berjalan lebih dulu supaya yang terbaca adalah masalahnya.
{
  const { readdir } = await import('node:fs/promises');
  const sisir = async (dir) => {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const jalur = `${dir}/${e.name}`;
      if (e.isDirectory()) { await sisir(jalur); continue; }
      if (!e.name.endsWith('.js')) continue;
      const isi = await readFile(jalur, 'utf8');
      const mulai = isi.indexOf('export const css = `');
      if (mulai < 0) continue;
      const a = mulai + 'export const css = `'.length;
      const b = isi.indexOf('`;', a);
      if (b < 0) continue;
      const baris = isi.slice(a, b).split('\n').findIndex(l => l.includes('`'));
      if (baris >= 0) {
        const noBaris = isi.slice(0, a).split('\n').length + baris;
        throw new Error(`${jalur}:${noBaris} — ada backtick di dalam "export const css". Ia menutup template literalnya lebih awal; pakai tanda kutip biasa di komentar CSS.`);
      }
    }
  };
  await sisir('src');
}

const OUT = 'dist';
const YEAR = new Date().getFullYear();
const BANNER = `/*! Spatial Indonesia — © ${YEAR}. Seluruh hak cipta dilindungi. */`;

const esbuild = (...args) =>
  execFileSync('npx', ['--yes', 'esbuild', ...args], { stdio: ['ignore', 'pipe', 'inherit'] });

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

// 1. bundel modul aplikasi (three.js tetap dari CDN, tidak ikut dibundel)
esbuild(
  'src/main.js', '--bundle', '--minify', '--format=esm', '--target=es2020',
  '--legal-comments=none', '--external:https://*',
  `--banner:js=${BANNER}`, `--outfile=${OUT}/app.js`
);

// 2. runtime Design Canvas ikut dipendekkan
esbuild('support.js', '--minify', '--legal-comments=none', `--outfile=${OUT}/support.js`);

// 3. halaman menunjuk ke bundel, bukan ke pohon src/
let html = await readFile('index.html', 'utf8');
html = html.replace('<script type="module" src="./src/main.js"></script>', '<script type="module" src="./app.js"></script>');
// Petunjuk modulepreload menunjuk berkas yang sama dengan tag skriptnya. Kalau
// yang satu ikut dibundel dan yang lain tidak, peramban mengunduh dua pohon
// modul yang berbeda: bundelnya dipakai, seluruh src/ terunduh percuma.
html = html.replace('<link rel="modulepreload" href="./src/main.js" />', '<link rel="modulepreload" href="./app.js" />');

// Suntikkan nilai dari .env ke meta tag
if (envVars.SPATIAL_API !== undefined) {
  html = html.replace(
    /<meta\s+name="spatial-api"\s+content="[^"]*"\s*\/?>/,
    envVars.SPATIAL_API
      // ? `<meta name="spatial-api" content="${envVars.SPATIAL_API}" />`
      ? `<meta name="spatial-api" content="https://api.spatialindonesia.org/api/v1" />`
      : ''
  );
  console.log(`  spatial-api → ${envVars.SPATIAL_API || '(dihapus, sama origin)'}`);
}

await writeFile(`${OUT}/index.html`, html);

// 4. robots.txt & sitemap.xml
//
// Dibangkitkan, bukan disimpan sebagai berkas tetap — dan alamatnya dibaca dari
// tag <link rel="canonical"> di index.html, bukan dari konstanta di sini.
//
// Alasannya satu: domain situs sudah tertulis di canonical, og:url, dan
// twitter:image. Menambah salinan keempat di berkas ini berarti suatu hari
// domainnya pindah, tiga tempat ikut diubah, dan sitemap-nya diam-diam
// menunjuk alamat lama — kesalahan yang tidak menimbulkan galat apa pun dan
// baru ketahuan berminggu-minggu kemudian lewat Search Console.
const canonical = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i)?.[1];

if (!canonical) {
  // Bukan sekadar peringatan yang bisa terlewat di antara baris log lain:
  // tanpa canonical, seluruh blok SEO di index.html kemungkinan besar ikut
  // hilang, dan rilis yang tidak bisa diindeks lebih buruk daripada rilis yang
  // gagal dirakit.
  throw new Error('index.html tidak punya <link rel="canonical">. Blok SEO-nya hilang?');
}

const situs = canonical.replace(/\/+$/, '');
const hariIni = new Date().toISOString().slice(0, 10);

// Satu URL, dan itu memang jujur: seluruh situs hidup di satu halaman. Begitu
// artikel atau acara punya alamatnya sendiri, di sinilah daftarnya bertambah.
await writeFile(`${OUT}/sitemap.xml`,
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${situs}/</loc>
    <lastmod>${hariIni}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`);

// `uploads/` ikut terunggah tapi isinya gambar yang sudah tampil di halaman —
// tidak ada gunanya dirayapi sebagai halaman tersendiri.
await writeFile(`${OUT}/robots.txt`,
  `# Spatial Indonesia
User-agent: *
Allow: /
Disallow: /uploads/

Sitemap: ${situs}/sitemap.xml
`);

console.log(`  situs        → ${situs}  (robots.txt + sitemap.xml)`);

// 5. berkas pendukung
//
// Tidak semua isi assets/ ikut. Yang disaring bukan sampah acak, melainkan tiga
// hal yang tidak dirujuk satu baris pun tapi selama ini terunggah tiap rilis:
//
//   assets/icons/*png   folder yang namanya memang berisi tanda bintang, 892 KB
//                       ikon PNG sisa kit desain — tidak satu pun dipakai
//   assets/3d           Planets.fbx, 280 KB; ARCHITECTURE.md sudah menjelaskan
//                       kenapa ia tidak pernah dimuat (bola ber-UV yang bisa
//                       dibuat satu baris, dengan ongkos FBXLoader)
//   assets/planets/*jpg pendahulu berkas .webp yang sekarang dipakai
//
// Berkasnya tetap ada di repo — yang berubah hanya apa yang dikirim ke server.
// Pola .jpg-nya diikat ke folder planet, bukan ke seluruh pohon: assets/
// juga memuat og-cover.jpg, gambar pratinjau tautan yang justru harus ikut.
const BUANG = [/assets\/icons\/\*png/, /assets\/3d(\/|$)/, /assets\/planets\/.*\.jpg$/i, /\.DS_Store$/];
const ikut = (src) => !BUANG.some(re => re.test(src));

for (const dir of ['assets', 'sounds', 'uploads']) {
  await cp(dir, `${OUT}/${dir}`, { recursive: true, filter: ikut }).catch(() => {});
}

// 6. isi public/ disalin apa adanya ke AKAR dist/
//
// Tempat berkas yang harus tersaji persis di root domain dengan namanya
// sendiri: bukti kepemilikan Google Search Console
// (googlef059dddd6f64e7d5.html), dan kelak yang sejenis — Bing, ads.txt.
//
// Kenapa tidak ditaruh langsung di dist/: perakit ini membuka dengan
// `rm -rf dist`, jadi apa pun yang cuma ada di sana lenyap di rilis
// berikutnya. Gejalanya menipu — verifikasi berhasil hari ini, lalu berminggu
// kemudian Search Console mencabut aksesnya sendiri karena berkasnya sudah
// tidak ada, dan datanya berhenti masuk tanpa ada yang menyentuh SEO.
await cp('public', OUT, { recursive: true }).catch(() => {});

const { size } = await stat(`${OUT}/app.js`);
console.log(`dist/app.js   ${(size / 1024).toFixed(1)} KB`);
console.log('siap diunggah: isi folder dist/ — bukan folder src/');

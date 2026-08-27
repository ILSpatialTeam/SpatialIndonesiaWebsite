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

// 4. berkas pendukung
for (const dir of ['assets', 'sounds', 'uploads']) {
  await cp(dir, `${OUT}/${dir}`, { recursive: true }).catch(() => {});
}

const { size } = await stat(`${OUT}/app.js`);
console.log(`dist/app.js   ${(size / 1024).toFixed(1)} KB`);
console.log('siap diunggah: isi folder dist/ — bukan folder src/');

// Pabrik tekstur kanvas kecil yang dipakai di banyak tempat.
import * as THREE from './three.js';

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

// cakram gradien lembut — dipakai korona matahari, partikel, dan pijar meteor
export function glowTexture(size, stops) {
  const c = makeCanvas(size, size);
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([o, col]) => grad.addColorStop(o, col));
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}

export function wrapText(ctx, text, maxW) {
  const words = String(text).split(' ');
  const out = [];
  let line = '';
  words.forEach(w => {
    const t = line ? line + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w; }
    else line = t;
  });
  if (line) out.push(line);
  return out;
}

// Peta permukaan planet.
//
// Dimuat belakangan dan sengaja tidak ditunggu: bolanya sudah muncul dengan
// warna paletnya, lalu permukaannya menyusul beberapa ratus milidetik kemudian.
// Menunda tampilnya seluruh tata surya demi setengah megabita gambar bukan
// pertukaran yang baik — dan kalau gambarnya gagal dimuat, yang tersisa tetap
// tata surya yang utuh, bukan layar kosong.
const skinLoader = new THREE.TextureLoader();
const skinCache = new Map();

export function skinTexture(name, onReady) {
  if (!name) return;
  const cached = skinCache.get(name);
  if (cached) { onReady(cached); return; }
  // WebP, bukan JPEG: gambar yang sama pada ukuran yang sama, 167 KB lebih
  // ringan untuk ketujuhnya. Tidak ada jalur mundur ke .jpg — peramban yang
  // tidak mengenal WebP juga tidak menjalankan WebGL2, jadi cabang itu hanya
  // akan menambah berkas yang tidak pernah diminta siapa pun.
  skinLoader.load(`assets/planets/${name}.webp`, tex => {
    // peta warna harus dibaca sebagai sRGB, kalau tidak hasilnya pucat
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    skinCache.set(name, tex);
    onReady(tex);
  }, undefined, () => { /* biarkan warna paletnya yang bertahan */ });
}

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

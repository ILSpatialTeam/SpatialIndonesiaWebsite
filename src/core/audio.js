// Infrastruktur suara.
//
// Dua modul memakai Web Audio — deru mesin orbit dan efek mode meteor. Dulu
// keduanya membuat AudioContext sendiri; browser membatasi jumlahnya, dan dua
// konteks berarti dua kali biaya untuk hal yang sama. Sekarang keduanya
// meminjam satu konteks dari sini, dan tetap tidak saling tahu.
let ctx = null;

export function audioContext() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// derau putih yang meluruh — bahan dasar dentum dan ledakan
export function noiseSource(c, dur) {
  const n = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, n, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = c.createBufferSource();
  src.buffer = buf;
  return src;
}

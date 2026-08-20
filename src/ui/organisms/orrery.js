// Organisme: peta orbit.
//
// Menggantikan deret angka yang tidak menolong siapa pun. Ia menggambar apa
// yang dilaporkan scene lewat `systemMap()` — dan klik di atasnya menerbangkan
// kamu ke sana. Ia tidak pernah menyentuh three.js sendiri.
import { el } from '../atoms/el.js';
import { scene } from '../../core/dom.js';

export const css = `/* -- peta orbit: menggantikan deret angka yang tidak dipakai siapa pun -- */
.hud-orrery { position: absolute; right: 26px; bottom: 22px; display: flex; flex-direction: column; align-items: center; gap: 6px; pointer-events: auto; animation: hudIn .8s cubic-bezier(.2,.7,.2,1) .55s both; }

.hud-orrery canvas { display: block; width: 132px; height: 132px; cursor: pointer; }

.hud-orrery .read { display: flex; align-items: baseline; gap: 9px; font-family: var(--hud-mono); font-size: 9.5px; letter-spacing: .16em; color: var(--hud-dim); white-space: nowrap; }

.hud-orrery .read b { font-weight: 400; color: var(--hud-mint); }

.hud-orrery .read u { text-decoration: none; color: var(--hud-paper); }

@media (max-width: 1100px) and (min-width: 780px) {
  .hud-orrery canvas { width: 108px; height: 108px; }
}

@media (max-width: 779px) {
  /* layar ponsel terlalu sempit untuk peta orbit tanpa menindih isi;
       dialnya kembali saat ada ruang */
    .hud-orrery { display: none; }
}`;

const cv = el('canvas', { width: 264, height: 264, title: 'Peta orbit — klik planet untuk terbang ke sana' });
const readLine = el('div', { class: 'read' });
export const node = el('div', { class: 'hud-orrery', 'data-hud-el': 'orrery' }, [cv, readLine]);
const ctx = cv.getContext('2d');
const DOT = { inti: '#9E94F9', program: '#a99bf2', karya: '#9E94F9', event: '#f3f2f8', insight: '#8b7ffb', tim: '#f3f2f8', gabung: '#9E94F9' };
let hoverStop = null;

export const draw = m => {
  const w = cv.width, h = cv.height, cxp = w / 2, cyp = h / 2, R = w * 0.44;
  ctx.clearRect(0, 0, w, h);

  // cakrawala instrumen
  ctx.strokeStyle = 'rgba(158,148,249,.18)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cxp, cyp, R + 12, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(243,242,248,.06)';
  ctx.lineWidth = 1.5;
  [0, Math.PI / 2].forEach(a => {
    ctx.beginPath();
    ctx.moveTo(cxp + Math.cos(a) * (R + 12), cyp + Math.sin(a) * (R + 12));
    ctx.lineTo(cxp - Math.cos(a) * (R + 12), cyp - Math.sin(a) * (R + 12));
    ctx.stroke();
  });

  // lintasan
  m.bodies.forEach(b => {
    ctx.strokeStyle = b.active ? 'rgba(158,148,249,.34)' : 'rgba(243,242,248,.08)';
    ctx.lineWidth = b.active ? 2 : 1.4;
    ctx.beginPath(); ctx.arc(cxp, cyp, b.orbit * R, 0, Math.PI * 2); ctx.stroke();
  });

  // inti
  const g = ctx.createRadialGradient(cxp, cyp, 0, cxp, cyp, 16);
  g.addColorStop(0, 'rgba(216,208,255,.95)');
  g.addColorStop(0.5, 'rgba(158,148,249,.45)');
  g.addColorStop(1, 'rgba(106,90,224,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(cxp, cyp, 16, 0, Math.PI * 2); ctx.fill();

  // planet
  m.bodies.forEach(b => {
    const x = cxp + b.x * R, y = cyp + b.z * R;
    const hot = b.active || b.hover || hoverStop === b.id;
    ctx.fillStyle = DOT[b.id] || '#f3f2f8';
    ctx.globalAlpha = hot ? 1 : 0.82;
    ctx.beginPath(); ctx.arc(x, y, hot ? 5.6 : 4, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    if (hot) {
      ctx.strokeStyle = DOT[b.id] || '#f3f2f8';
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(x, y, 10.5, 0, Math.PI * 2); ctx.stroke();
    }
  });

  // kapal: arah pandang ikut digambar, itu yang bikin peta ini kepakai
  const sx = cxp + m.cam.x * R, sy = cyp + m.cam.z * R;
  const ang = Math.atan2(-m.cam.z, -m.cam.x);
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(ang);
  ctx.fillStyle = '#ffb066';
  ctx.beginPath();
  ctx.moveTo(9, 0); ctx.lineTo(-6, 6); ctx.lineTo(-3, 0); ctx.lineTo(-6, -6);
  ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,176,102,.3)';
  ctx.lineWidth = 1.2;
  ctx.setLineDash([4, 5]);
  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(cxp, cyp); ctx.stroke();
  ctx.setLineDash([]);
};

const hitStop = e => {
  const s = scene();
  if (!s || !s.systemMap) return null;
  const r = cv.getBoundingClientRect();
  const m = s.systemMap();
  const R = cv.width * 0.44, k = cv.width / r.width;
  const px = (e.clientX - r.left) * k, py = (e.clientY - r.top) * k;
  let best = null, bd = 18;
  m.bodies.forEach(b => {
    const d = Math.hypot(px - (cv.width / 2 + b.x * R), py - (cv.height / 2 + b.z * R));
    if (d < bd) { bd = d; best = b.id; }
  });
  if (!best && Math.hypot(px - cv.width / 2, py - cv.height / 2) < 20) best = 'inti';
  return best;
};
cv.addEventListener('pointermove', e => { hoverStop = hitStop(e); cv.style.cursor = hoverStop ? 'pointer' : 'default'; });
cv.addEventListener('pointerleave', () => { hoverStop = null; });
cv.addEventListener('click', e => {
  const id = hitStop(e);
  const s = scene();
  if (id && s && s.travelTo) s.travelTo(id);
});

// dipakai baris bacaan di bawah dial
export const NAMES = { inti: 'INTI', program: 'PROGRAM', karya: 'KARYA', event: 'EVENT', insight: 'INSIGHT', tim: 'TIM', gabung: 'GABUNG' };

export function readout(m) {
  const km = (m.dist * 1.4e3).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  readLine.replaceChildren(
    el('span', { text: m.target ? 'TUJUAN' : 'ORBIT' }),
    el('u', { text: m.target ? NAMES[m.target] : 'BEBAS' }),
    el('span', { text: '·' }),
    el('b', { text: km + ' KM' })
  );
}

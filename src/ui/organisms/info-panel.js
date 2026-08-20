// Organisme: panduan mengemudi.
//
// Isinya dibaca dari template — daftar petunjuk yang dulu tergeletak di pojok
// kiri bawah — lalu disusun ulang sebagai rasi kecil: tiap baris punya
// bintangnya, dan garis tipis menghubungkan semuanya saat panel dibuka.
import { el, NS } from '../atoms/el.js';

export const css = `/* -- petunjuk: dibungkus jadi satu tombol, terbuka seperti rasi bintang -- */
.hud-info { position: absolute; left: 30px; bottom: 26px; pointer-events: auto; }

.hud-info .panel {
  position: absolute; left: 0; bottom: 56px; width: 268px; padding: 18px 18px 16px;
  border-radius: 14px; background: rgba(12,10,16,.9); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
  box-shadow: 0 0 0 1px rgba(158,148,249,.16), 0 22px 60px rgba(0,0,0,.55);
  opacity: 0; transform: scale(.9); transform-origin: 24px calc(100% + 32px); pointer-events: none;
  transition: opacity .3s, transform .45s cubic-bezier(.2,.7,.2,1);
}

.hud-info.open .panel { opacity: 1; transform: none; pointer-events: auto; }

.hud-info .panel h4 { margin: 0 0 14px; font-family: var(--hud-mono); font-size: 9px; letter-spacing: .26em; color: var(--hud-dim); font-weight: 400; }

.hud-info .lines { position: relative; display: flex; flex-direction: column; gap: 12px; }

.hud-info .lines svg.web { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none; }

.hud-info .lines svg.web path { stroke: rgba(158,148,249,.4); stroke-width: 1; fill: none; stroke-dasharray: 300; stroke-dashoffset: 300; }

.hud-info.open .lines svg.web path { animation: hudDraw 1s ease .12s forwards; }

.hud-info .row { position: relative; display: flex; align-items: flex-start; gap: 12px; font-size: 11.5px; line-height: 1.45; color: #b9b4cc; opacity: 0; transform: translateY(6px); }

.hud-info.open .row { animation: hudRow .4s cubic-bezier(.2,.7,.2,1) forwards; animation-delay: calc(.14s + var(--i) * .09s); }

.hud-info .row i { flex: 0 0 auto; width: 7px; height: 7px; margin-top: 5px; border-radius: 50%; background: var(--hud-mint); box-shadow: 0 0 10px rgba(169,155,242,.75); font-style: normal; }

/* titiknya digeser berselang-seling supaya garis penghubungnya membentuk pola
   rasi, bukan satu garis lurus yang kaku */
.hud-info .row:nth-child(3) { padding-left: 14px; }

.hud-info .row:nth-child(4) { padding-left: 5px; }

.hud-info .row:nth-child(5) { padding-left: 18px; }

.hud-info .row:last-child i { background: var(--hud-paper); box-shadow: 0 0 10px rgba(243,242,248,.7); }

@keyframes hudDraw { to { stroke-dashoffset: 0; } }

@keyframes hudRow { to { opacity: 1; transform: none; } }

@media (max-width: 779px) {
  .hud-info { left: 12px; bottom: calc(126px + env(safe-area-inset-bottom)); }
  .hud-info .panel { width: min(300px, calc(100vw - 34px)); bottom: 50px; }
}`;

let btnRef = null;
export function mountButton(btn) { btnRef = btn; node.appendChild(btn); }

// Panduan tinggal di dekat tempat aslinya dulu — di kiri bawah, dekat tangan
// yang sedang mengemudi — bukan ikut ke deretan tombol mode di kanan atas.
const infoPanel = el('div', { class: 'panel', 'data-hud-el': 'info' });
export const node = el('div', { class: 'hud-info' }, [infoPanel]);

const buildInfo = () => {
  const src = document.querySelector('[data-ui="hints"]');
  const rows = src ? [...src.querySelectorAll('span')].map(s => s.textContent.trim()) : [];
  if (!rows.length) return;
  infoPanel.replaceChildren();
  infoPanel.appendChild(el('h4', { text: 'CARA MENGEMUDI' }));
  const lines = el('div', { class: 'lines' });
  const web = document.createElementNS(NS, 'svg');
  web.setAttribute('class', 'web');
  web.setAttribute('preserveAspectRatio', 'none');
  const path = document.createElementNS(NS, 'path');
  web.appendChild(path);
  lines.appendChild(web);
  rows.forEach((t, i) => {
    lines.appendChild(el('div', { class: 'row', style: '--i:' + i }, [el('i'), el('span', { text: t })]));
  });
  infoPanel.appendChild(lines);
  // hairline yang menyambung tiap titik jadi satu rasi kecil
  requestAnimationFrame(() => {
    const dots = [...lines.querySelectorAll('.row i')];
    if (dots.length < 2) return;
    const base = lines.getBoundingClientRect();
    const d = dots.map(n => {
      const r = n.getBoundingClientRect();
      return [(r.left - base.left + r.width / 2).toFixed(1), (r.top - base.top + r.height / 2).toFixed(1)];
    });
    path.setAttribute('d', 'M' + d.map(p => p.join(' ')).join(' L'));
  });
};

let infoOpen = false;
export const toggleInfo = force => {
  infoOpen = force === undefined ? !infoOpen : !!force;
  if (infoOpen) buildInfo();
  node.classList.toggle('open', infoOpen);
  if (btnRef) btnRef.classList.toggle('on', infoOpen);
};

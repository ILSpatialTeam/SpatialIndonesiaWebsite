// Organisme: mode fokus & layar penuh.
//
// Memadamkan seluruh antarmuka lewat satu kelas di <html>, menyisakan tata
// suryanya saja. Berkas ini tidak tahu ada berapa panel yang dipadamkan — CSS
// yang mengurusnya.
import { el } from '../atoms/el.js';
import { signal } from './signals.js';

export const css = `/* -- keluar fokus -- */
.hud-exit {
  position: absolute; left: 50%; bottom: 34px; transform: translateX(-50%);
  display: none; align-items: center; gap: 9px; padding: 9px 16px; border: 0; border-radius: 999px;
  background: rgba(12,10,16,.72); box-shadow: 0 0 0 1px rgba(158,148,249,.2);
  color: var(--hud-muted); font-family: var(--hud-mono); font-size: 9.5px; letter-spacing: .2em;
  cursor: pointer; pointer-events: auto; transition: opacity .5s, color .2s;
}

html.hud-focus .hud-exit { display: flex; }

.hud-exit:hover { color: var(--hud-paper); }

.hud-exit.idle { opacity: 0; }`;

let btnRef = null, fullRef = null;
export function mountButtons(focusBtn, fullBtn) { btnRef = focusBtn; fullRef = fullBtn; }

export const node = el('button', { class: 'hud-exit', text: 'ESC — KELUAR MODE FOKUS', onclick: () => setFocus(false) });
let focusOn = false, idleT = 0;
export const setFocus = on => {
  focusOn = !!on;
  document.documentElement.classList.toggle('hud-focus', focusOn);
  if (btnRef) btnRef.classList.toggle('on', focusOn);
  if (focusOn) nudgeExit();
};
const nudgeExit = () => {
  node.classList.remove('idle');
  clearTimeout(idleT);
  idleT = setTimeout(() => node.classList.add('idle'), 2600);
};
addEventListener('pointermove', () => { if (focusOn) nudgeExit(); }, { passive: true });
addEventListener('keydown', e => {
  if (e.key === 'Escape' && focusOn) { e.stopImmediatePropagation(); setFocus(false); }
}, true);

export const toggleFull = () => {
  const d = document;
  if (d.fullscreenElement || d.webkitFullscreenElement) {
    (d.exitFullscreen || d.webkitExitFullscreen).call(d);
  } else {
    const r = d.documentElement;
    const go = r.requestFullscreen || r.webkitRequestFullscreen;
    if (go) go.call(r).catch(() => signal('Layar penuh ditolak browser. Coba dari jendela biasa, bukan tampilan tersemat.', 'warn'));
    else signal('Browser ini tidak mendukung layar penuh.', 'warn');
  }
};
['fullscreenchange', 'webkitfullscreenchange'].forEach(ev =>
  document.addEventListener(ev, () => {
    if (fullRef) fullRef.classList.toggle('on', !!(document.fullscreenElement || document.webkitFullscreenElement));
  }));

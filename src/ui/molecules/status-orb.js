// Molekul: penanda orbit.
//
// Statusnya terbaca dari geraknya — titik yang mengelilingi cincin melambat
// begitu kamu terkunci ke sebuah planet. Tidak ada kotak, tidak ada label
// kapital berbingkai; bentuknya sendiri yang bercerita.
import { el } from '../atoms/el.js';

export const css = `/* -- penanda orbit: benar-benar berputar saat mengorbit bebas -- */
.hud-status { display: flex; align-items: center; gap: 9px; margin-right: 6px; align-self: center; pointer-events: none; }

.hud-status .orb { position: relative; width: 17px; height: 17px; }

.hud-status .orb i { position: absolute; inset: 3px; border-radius: 50%; border: 1px solid rgba(158,148,249,.45); }

.hud-status .orb b { position: absolute; inset: 6.5px; border-radius: 50%; background: var(--hud-mint); box-shadow: 0 0 8px rgba(169,155,242,.8); }

.hud-status .orb s { position: absolute; inset: 0; animation: hudSpin 4.5s linear infinite; }

.hud-status .orb s::after { content: ''; position: absolute; top: 0; left: 50%; width: 3.5px; height: 3.5px; margin-left: -1.75px; border-radius: 50%; background: var(--hud-paper); box-shadow: 0 0 7px rgba(243,242,248,.9); }

.hud-status.locked .orb s { animation-duration: 16s; }

.hud-status.locked .orb b { background: var(--hud-iris); }

.hud-status .txt { font-family: var(--hud-mono); font-size: 9.5px; letter-spacing: .22em; color: var(--hud-dim); }

@media (max-width: 779px) {
  .hud-status { display: none; }
}`;

const txt = el('span', { class: 'txt', text: 'ORBIT BEBAS' });
export const node = el('div', { class: 'hud-status' }, [
  el('span', { class: 'orb' }, [el('i'), el('b'), el('s')]),
  txt
]);

export function setMode(label) {
  txt.textContent = label;
  node.classList.toggle('locked', label !== 'ORBIT BEBAS');
}

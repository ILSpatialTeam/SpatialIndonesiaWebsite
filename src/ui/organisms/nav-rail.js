// Organisme: rel navigasi.
//
// Versi terlipat dari rencana penerbangan. Tombolnya tidak memanggil scene
// langsung — ia menekan tombol asli di dalam template, jadi hanya ada satu
// tempat yang tahu cara berpindah planet.
import { el } from '../atoms/el.js';
import { icon } from '../atoms/icon.js';
import { press, wide } from '../../core/dom.js';

export const css = `/* -- rel navigasi: rencana penerbangan yang bisa dilipat -- */
.hud-rail { position: absolute; left: 30px; top: 92px; display: flex; flex-direction: column; gap: 6px; pointer-events: auto; }

.hud-rail .fold {
  width: 30px; height: 30px; display: grid; place-items: center; border: 0; border-radius: 50%;
  background: rgba(18,17,22,.5); color: var(--hud-dim); cursor: pointer; transition: color .2s, transform .35s cubic-bezier(.2,.7,.2,1);
}

.hud-rail .fold svg { width: 17px; height: 17px; }

.hud-rail .fold:hover { color: var(--hud-paper); }

html.fp-open .hud-rail .fold { transform: translateX(226px); }

.hud-rail .stops { display: flex; flex-direction: column; gap: 3px; margin-top: 4px; opacity: 1; transition: opacity .3s; }

html.fp-open .hud-rail .stops { opacity: 0; pointer-events: none; }

.hud-rail .stop { position: relative; width: 30px; height: 30px; display: grid; place-items: center; border: 0; border-radius: 9px; background: transparent; cursor: pointer; transition: background .2s; }

.hud-rail .stop:hover { background: rgba(158,148,249,.12); }

.hud-rail .stop span { display: block; }

.hud-rail .stop em {
  position: absolute; left: 38px; top: 50%; transform: translateY(-50%) translateX(-6px);
  padding: 4px 9px; border-radius: 6px; background: rgba(18,17,22,.86); font-style: normal;
  font-family: var(--hud-mono); font-size: 9px; letter-spacing: .16em; color: var(--hud-paper);
  white-space: nowrap; opacity: 0; transition: opacity .2s, transform .2s; pointer-events: none;
}

.hud-rail .stop:hover em { opacity: 1; transform: translateY(-50%); }

html.fp-hidden [data-ui="flightplan"] { opacity: 0 !important; pointer-events: none !important; transition: opacity .35s; }

@media (max-width: 779px) {
  /* 1. Tombol ORBIT BEBAS ikut menggulung bersama daftar planet, bukan
       menempel di ujung. Yang menggulung sekarang seluruh stripnya, dan
       batang penunjuk gulirnya disembunyikan. */
    [data-ui="flightplan"] {
      overflow-x: auto !important; overflow-y: hidden !important;
      flex-wrap: nowrap !important; scrollbar-width: none; -webkit-overflow-scrolling: touch;
    }
  [data-ui="flightplan"]::-webkit-scrollbar { display: none; }
  [data-ui="fpList"] { overflow-x: visible !important; flex: 0 0 auto !important; padding-bottom: 0 !important; scrollbar-width: none; }
  [data-ui="fpList"]::-webkit-scrollbar { display: none; }
  [data-ui="freeflight"] { flex: 0 0 auto !important; }
  /* Safari iOS memang tidak melayaninya */
    .hud-rail { display: none; }
}`;

const STOPS = ['inti', 'program', 'karya', 'event', 'insight', 'tim', 'gabung'];
const NAMES = { inti: 'INTI', program: 'PROGRAM', karya: 'KARYA', event: 'EVENT', insight: 'INSIGHT', tim: 'TIM', gabung: 'GABUNG' };
const foldBtn = el('button', { class: 'fold', title: 'Sembunyikan rencana penerbangan', 'aria-label': 'Sembunyikan rencana penerbangan' }, [icon('chevL')]);
const stops = el('div', { class: 'stops' }, STOPS.map(id => el('button', {
  class: 'stop', title: NAMES[id], 'aria-label': NAMES[id],
  onclick: () => press('[data-nav="' + id + '"]')
}, [el('span', { 'data-planet-icon': id }), el('em', { text: NAMES[id] })])));
export const node = el('div', { class: 'hud-rail', 'data-hud-el': 'rail' }, [foldBtn, stops]);

let fpOpen = localStorage.getItem('si.fp') !== 'off';
const applyFold = () => {
  // di ponsel rencana penerbangan sudah jadi strip kecil di bawah, dan relnya
  // tidak ditampilkan — jangan sampai ia tersembunyi tanpa cara mengembalikan
  const fold = !fpOpen && wide();
  document.documentElement.classList.toggle('fp-open', !fold);
  document.documentElement.classList.toggle('fp-hidden', fold);
  foldBtn.replaceChildren(icon(fpOpen ? 'chevL' : 'chevR'));
  foldBtn.title = fpOpen ? 'Sembunyikan rencana penerbangan' : 'Tampilkan rencana penerbangan';
  try { localStorage.setItem('si.fp', fpOpen ? 'on' : 'off'); } catch (e) { /* boleh gagal */ }
};
foldBtn.addEventListener('click', () => { fpOpen = !fpOpen; applyFold(); });
addEventListener('resize', applyFold);

export { applyFold };

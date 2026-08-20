// Molekul: tombol instrumen bundar.
//
// Terdiri dari atom-atom kecil — cincin, busur berputar, ikon, dan keterangan
// yang muncul saat disentuh. Ia tidak tahu apa tugasnya; itu urusan pemanggil.
import { el } from '../atoms/el.js';
import { icon } from '../atoms/icon.js';

export const css = `.hud-row.tools .hud-btn { width: 36px; height: 36px; }

.hud-row.tools .hud-btn svg { width: 17px; height: 17px; }

.hud-row.tools .hud-btn .cap { top: 42px; }

.hud-btn {
  position: relative; width: 46px; height: 46px; padding: 0; border: 0; border-radius: 50%;
  background: radial-gradient(circle at 50% 35%, rgba(158,148,249,.13), rgba(18,17,22,.55) 70%);
  color: var(--hud-muted); cursor: pointer; display: grid; place-items: center;
  transition: color .25s, background .25s, transform .25s;
}

.hud-btn svg { width: 21px; height: 21px; position: relative; z-index: 1; }

.hud-btn .ring { position: absolute; inset: 0; border-radius: 50%; border: 1px solid rgba(243,242,248,.14); transition: border-color .25s, box-shadow .25s; }

.hud-btn .arc { position: absolute; inset: -3px; border-radius: 50%; border: 1px dashed transparent; }

.hud-btn:hover { color: var(--hud-paper); transform: translateY(-1px); }

.hud-btn:hover .ring { border-color: rgba(158,148,249,.55); box-shadow: 0 0 22px rgba(106,90,224,.28); }

.hud-btn:hover .arc { border-color: rgba(158,148,249,.34); animation: hudSpin 7s linear infinite; }

.hud-btn:focus-visible { outline: none; }

.hud-btn:focus-visible .ring { border-color: var(--hud-iris); box-shadow: 0 0 0 2px rgba(158,148,249,.3); }

.hud-btn.on { color: var(--hud-iris); background: radial-gradient(circle at 50% 35%, rgba(106,90,224,.4), rgba(18,17,22,.5) 72%); }

.hud-btn.on .ring { border-color: rgba(158,148,249,.8); box-shadow: 0 0 26px rgba(106,90,224,.4); }

.hud-btn.on .arc { border-color: rgba(158,148,249,.4); animation: hudSpin 12s linear infinite; }

.hud-btn[data-hud-btn="meteor"] { color: #c88a5e; }

.hud-btn[data-hud-btn="meteor"]:hover { color: var(--hud-hot); }

.hud-btn[data-hud-btn="meteor"]:hover .ring { border-color: rgba(255,138,61,.6); box-shadow: 0 0 22px rgba(255,110,44,.3); }

.hud-btn[data-hud-btn="meteor"].on { color: var(--hud-hot); background: radial-gradient(circle at 50% 35%, rgba(255,110,44,.34), rgba(18,17,22,.5) 72%); }

.hud-btn[data-hud-btn="meteor"].on .ring { border-color: rgba(255,138,61,.75); box-shadow: 0 0 26px rgba(255,110,44,.35); }

.hud-btn .cap {
  position: absolute; top: 52px; left: 50%; transform: translateX(-50%) translateY(-4px);
  font-family: var(--hud-mono); font-size: 8.5px; letter-spacing: .18em; color: var(--hud-dim);
  white-space: nowrap; opacity: 0; transition: opacity .22s, transform .22s; pointer-events: none;
}

.hud-btn:hover .cap, .hud-btn:focus-visible .cap { opacity: 1; transform: translateX(-50%); }

/* portal VR: aksi utama, jadi ia punya nama yang selalu terbaca */
.hud-portal { display: flex; align-items: center; gap: 11px; padding-right: 4px; }

.hud-portal .hud-btn { width: 52px; height: 52px; color: var(--hud-iris); background: radial-gradient(circle at 50% 32%, rgba(106,90,224,.5), rgba(18,17,22,.5) 74%); }

.hud-portal .hud-btn svg { width: 24px; height: 24px; }

.hud-portal .hud-btn .ring { border-color: rgba(158,148,249,.6); }

.hud-portal .hud-btn .arc { border-color: rgba(158,148,249,.3); animation: hudSpin 14s linear infinite; }

.hud-portal .hud-btn:hover { color: #fff; }

.hud-portal .hud-btn:hover .ring { box-shadow: 0 0 34px rgba(106,90,224,.55); }

.hud-portal .hud-btn:hover .arc { animation-duration: 4s; }

.hud-portal .lbl { font-family: var(--hud-mono); font-size: 10px; letter-spacing: .2em; color: var(--hud-mint); white-space: nowrap; }

.hud-portal .hud-btn .cap { display: none; }

/* undangan sekali pakai: tombol papan misi berdenyut di kunjungan pertama */
.hud-btn.invite .ring { animation: hudInvite 2.6s ease-in-out 3; }

@keyframes hudInvite { 0%, 100% { border-color: rgba(243,242,248,.14); box-shadow: none; } 50% { border-color: rgba(158,148,249,.8); box-shadow: 0 0 26px rgba(106,90,224,.45); } }

@media (max-width: 779px) {
  .hud-btn { width: 34px; height: 34px; }
  .hud-btn svg { width: 16px; height: 16px; }
  .hud-btn .cap { display: none; }
  .hud-portal .hud-btn { width: 38px; height: 38px; }
  .hud-portal .hud-btn svg { width: 18px; height: 18px; }
  .hud-portal .lbl { display: none; }
  .hud-btn[data-hud-btn="full"] { display: none; }
  /* naik di atas strip rencana penerbangan, bukan menindihnya */
    .hud-row.tools .hud-btn { width: 30px; height: 30px; }
  .hud-row.tools .hud-btn svg { width: 15px; height: 15px; }
}`;

export const instrument = (name, key, cap, onclick) => el('button', {
  class: 'hud-btn', 'data-hud-btn': key, title: cap, 'aria-label': cap, onclick
}, [el('span', { class: 'ring' }), el('span', { class: 'arc' }), icon(name), el('span', { class: 'cap', text: cap.toUpperCase() })]);

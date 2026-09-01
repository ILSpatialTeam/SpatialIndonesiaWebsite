// Organisme: gugus instrumen.
//
// Dua baris dengan maksud berbeda — yang atas membawa kamu ke tempat lain,
// yang bawah mengubah cara memandang tempat ini. Gugus ini tidak membuat
// tombolnya sendiri; ia hanya menerima dan menatanya (open/closed: menambah
// alat baru tidak mengubah berkas ini).
import { el } from '../atoms/el.js';

export const css = `/* saat fokus, yang tersisa hanya tata suryanya sendiri */
html.hud-focus [data-ui="header"], html.hud-focus [data-ui="flightplan"],
html.hud-focus [data-ui="cursorpick"], html.hud-focus [data-planet-label],
html.hud-focus [data-intro], html.hud-focus [data-panel], html.hud-focus .pn-root,
html.hud-focus .hud-cluster, html.hud-focus .hud-orrery, html.hud-focus .hud-rail,
html.hud-focus .hud-corner, html.hud-focus [data-ui="reticle"], html.hud-focus [data-ui="frame"],
html.hud-focus .hud-hero {
  opacity: 0 !important; pointer-events: none !important; transition: opacity .6s ease;
}

html.mt-on .hud-layer, html.pn-read .hud-orrery, html.pn-read .hud-rail,
html.pn-read .hud-corner, html.pn-read .hud-cluster, html.pn-read .hud-hero { opacity: 0; pointer-events: none; transition: opacity .4s; }

/* -- instrumen bundar -- */
.hud-cluster { position: absolute; top: 26px; right: 30px; display: flex; flex-direction: column; align-items: flex-end; gap: 9px; pointer-events: auto; animation: hudIn .8s cubic-bezier(.2,.7,.2,1) .35s both; }

.hud-row { display: flex; align-items: center; gap: 10px; }

/* baris kedua: alat pandang, lebih kecil karena ia bukan tujuan utama */
.hud-row.tools { gap: 7px; }

@media (max-width: 779px) {
  .hud-cluster { top: calc(13px + env(safe-area-inset-top)); right: 12px; gap: 6px; }
}`;

export function createCluster({ status, modes, tools }) {
  return el('div', { class: 'hud-cluster', 'data-hud-el': 'cluster' }, [
    el('div', { class: 'hud-row modes' }, [status].concat(modes)),
    el('div', { class: 'hud-row tools' }, tools)
  ]);
}

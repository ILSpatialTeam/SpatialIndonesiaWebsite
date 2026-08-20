// Perakit gaya.
//
// Tiap komponen membawa CSS-nya sendiri — atom, molekul, dan organisme
// masing-masing memiliki tampilannya. Berkas ini hanya menjahitnya jadi satu
// dan menyuntikkannya sekali; tidak ada satu pun aturan yang ditulis di sini.
import { el } from './atoms/el.js';
import { css as base } from './styles/base.js';
import { css as instrument } from './molecules/instrument.js';
import { css as statusOrb } from './molecules/status-orb.js';
import { css as cluster } from './organisms/cluster.js';
import { css as signals } from './organisms/signals.js';
import { css as navRail } from './organisms/nav-rail.js';
import { css as infoPanel } from './organisms/info-panel.js';
import { css as orrery } from './organisms/orrery.js';
import { css as heroBoard } from './organisms/hero-board.js';
import { css as eventCard } from './organisms/event-card.js';
import { css as postcard } from './organisms/postcard.js';
import { css as focusMode } from './organisms/focus-mode.js';

export function injectStyles() {
  const sheet = [
    base, instrument, statusOrb, cluster, signals, navRail,
    infoPanel, orrery, heroBoard, eventCard, postcard, focusMode
  ].join('\n\n');
  document.head.appendChild(el('style', { text: sheet }));
}

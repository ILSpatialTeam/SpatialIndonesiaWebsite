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
import { css as toolbelt } from './organisms/toolbelt.js';
import { css as signals } from './organisms/signals.js';
import { css as navRail } from './organisms/nav-rail.js';
import { css as infoPanel } from './organisms/info-panel.js';
import { css as social } from './organisms/social.js';
import { css as orrery } from './organisms/orrery.js';
import { css as heroBoard } from './organisms/hero-board.js';
import { css as eventCard } from './organisms/event-card.js';
import { css as eventDetail } from './organisms/event-detail.js';
import { css as postcard } from './organisms/postcard.js';
import { css as focusMode } from './organisms/focus-mode.js';
import { css as starPlace } from './organisms/star-place.js';
import { css as starCard } from './organisms/star-card.js';

export function injectStyles() {
  const sheet = [
    base, instrument, statusOrb, cluster, toolbelt, signals, navRail,
    infoPanel, social, orrery, heroBoard, eventCard, eventDetail, postcard, focusMode, starPlace, starCard
  ].join('\n\n');
  document.head.appendChild(el('style', { text: sheet }));
}

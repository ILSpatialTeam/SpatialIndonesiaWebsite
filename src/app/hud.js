// Konsol — akar penyusun lapisan antarmuka.
//
// Berkas ini tidak menggambar apa pun dan tidak menyimpan keadaan apa pun. Ia
// membuat tombol, menyerahkannya kepada organisme yang bersangkutan, memasang
// lapisannya ke halaman, lalu menyambungkan kejadian dari scene ke organisme
// yang peduli. Semua perilaku ada di modulnya masing-masing.
//
// Kendali lama di dalam template tidak dihapus, hanya disembunyikan — tombol di
// sini menekannya dari belakang layar, jadi seluruh penanganan galat WebXR yang
// sudah matang tetap dipakai tanpa disalin ulang.
import { el } from '../ui/atoms/el.js';
import { scene, wide, press, whenPresent } from '../core/dom.js';
import { injectStyles } from '../ui/styles.js';
import { instrument } from '../ui/molecules/instrument.js';
import * as statusOrb from '../ui/molecules/status-orb.js';
import { createCluster } from '../ui/organisms/cluster.js';
import { signal, node as signalsNode } from '../ui/organisms/signals.js';
import * as navRail from '../ui/organisms/nav-rail.js';
import * as info from '../ui/organisms/info-panel.js';
import * as orrery from '../ui/organisms/orrery.js';
import * as hero from '../ui/organisms/hero-board.js';
import * as eventCard from '../ui/organisms/event-card.js';
import * as postcard from '../ui/organisms/postcard.js';
import * as focusMode from '../ui/organisms/focus-mode.js';
import { ambience } from './ambience.js';
import { mountButton as mountAudioButton } from './ambience.js';
import { agendaState } from '../data/agenda.js';

injectStyles();

/* ---------- instrumen ---------- */

const infoBtn = instrument('info', 'info', 'Panduan', () => info.toggleInfo());
const boardBtn = instrument('board', 'board', 'Papan misi', () => hero.toggleBoard());
const skyBtn = instrument('sky', 'sky', 'Rasi bintang', () => {
  const s = scene();
  if (s && s.setConstellations) skyBtn.classList.toggle('on', s.setConstellations());
});
const auroraBtn = instrument('aurora', 'aurora', 'Aurora', () => {
  const s = scene();
  if (s && s.setAurora) auroraBtn.classList.toggle('on', s.setAurora());
});
const galaxyBtn = instrument('galaxy', 'galaxy', 'Galaksi', () => {
  const s = scene();
  if (s && s.setMilkyWay) galaxyBtn.classList.toggle('on', s.setMilkyWay());
});
const trailsBtn = instrument('trails', 'trails', 'Jejak penjelajah', () => {
  const s = scene();
  if (s && s.setTrails) trailsBtn.classList.toggle('on', s.setTrails());
});
const audioBtn = instrument('audio', 'audio', 'Suara orbit', () => ambience.toggle());
const cardBtn = instrument('card', 'card', 'Kartu pos orbit', () => postcard.makeCard());
const focusBtn = instrument('focus', 'focus', 'Mode fokus', () => focusMode.setFocus(true));
const fullBtn = instrument('full', 'full', 'Layar penuh', () => focusMode.toggleFull());
const meteorBtn = instrument('meteor', 'meteor', 'Mode meteor', () => press('[data-ui="meteorbtn"]'));
const arBtn = instrument('ar', 'ar', 'Mode AR', () => press('[data-ui="arbtn"]'));
const vrBtn = instrument('vr', 'vr', 'Mode VR', () => press('[data-ui="vrbtn"]'));
const portal = el('div', { class: 'hud-portal' }, [vrBtn, el('span', { class: 'lbl', text: 'MODE VR' })]);

info.mountButton(infoBtn);
hero.mountButton(boardBtn);
focusMode.mountButtons(focusBtn, fullBtn);
mountAudioButton(audioBtn);

const cluster = createCluster({
  status: statusOrb.node,
  modes: [meteorBtn, arBtn, portal],
  tools: [boardBtn, skyBtn, galaxyBtn, auroraBtn, trailsBtn, audioBtn, cardBtn, focusBtn, fullBtn]
});

/* ---------- pasang ---------- */

document.body.appendChild(el('div', { class: 'hud-layer' }, [
  cluster, navRail.node, info.node, hero.node, orrery.node, signalsNode, focusMode.node, postcard.node
]));
navRail.applyFold();

/* ---------- kabel ke scene ---------- */

// status mode dicerminkan dari HUD lama yang sekarang tersembunyi
whenPresent('[data-hud="mode"]', modeSrc => {
  const syncMode = () => statusOrb.setMode((modeSrc.textContent || '').trim());
  new MutationObserver(syncMode).observe(modeSrc, { childList: true, characterData: true, subtree: true });
  syncMode();
});

// begitu pula pesan sistem: ia tidak lagi jadi teks abu-abu di pojok
whenPresent('[data-hud="xr"]', xrSrc => {
  let last = '';
  new MutationObserver(() => {
    const t = (xrSrc.textContent || '').trim();
    if (!t || t === last || /cek dukungan/i.test(t)) { last = t; return; }
    last = t;
    signal(t);
  }).observe(xrSrc, { childList: true, characterData: true, subtree: true });
});

// agenda menggerakkan papan misi dan kartu Event dari satu sumber yang sama
const paintAgenda = st => { hero.paint(st); eventCard.paint(st); };
document.addEventListener('agenda', e => paintAgenda(e.detail));
// wadah kartu Event ada di dalam template; tunggu sampai ia benar-benar muncul
whenPresent('[data-agenda-list]', () => paintAgenda(agendaState()));
paintAgenda(agendaState());
hero.paintPresence();

document.addEventListener('planet-focus', e => {
  hero.node.classList.add('away');
  if (e.detail && e.detail.id === 'event') { eventCard.reset(); eventCard.paint(agendaState()); }
});
document.addEventListener('planet-free', () => hero.node.classList.remove('away'));
document.addEventListener('meteor-start', () => { hero.node.classList.add('away'); meteorBtn.classList.add('on'); });
document.addEventListener('meteor-end', () => { hero.node.classList.remove('away'); meteorBtn.classList.remove('on'); });

document.addEventListener('trails', e => {
  const d = e.detail || {};
  trailsBtn.classList.toggle('on', !!d.on);
  if (d.on) signal(d.count + ' penjelajah terakhir meninggalkan jejaknya di sini. Yang paling terang baru saja lewat.');
});

// keadaan tombol galaksi datang dari scene, bukan ditebak di sini — termasuk
// keadaan awalnya, yang dipancarkan sekali saat sistemnya dibangun
document.addEventListener('milkyway', e => {
  galaxyBtn.classList.toggle('on', !!(e.detail && e.detail.on));
});

// aurora selalu muncul di tempat berbeda, jadi sebutkan di mana ia menyala
document.addEventListener('aurora', e => {
  const d = e.detail || {};
  auroraBtn.classList.toggle('on', !!d.on);
  if (d.on) signal(d.near ? 'Aurora menyala di dekat orbit ' + d.near + '.' : 'Aurora menyala di tepi sistem.');
});

// begitu rasi dinyalakan, sebutkan langit mana yang sedang dilihat
document.addEventListener('sky-lore', e => {
  skyBtn.classList.toggle('on', !!(e.detail && e.detail.on));
  if (!(e.detail && e.detail.on)) return;
  const s = scene();
  const r = s && s.skyReport ? s.skyReport() : null;
  if (!r) return;
  const up = r.items.filter(i => i.up).map(i => i.name);
  signal('Langit Indonesia pukul ' + r.clock + ' WIB. ' + (up.length
    ? up.join(', ') + ' sedang di atas ufuk.'
    : 'Semua rasi sedang di bawah ufuk — cobalah di jam yang lain.'));
});

document.addEventListener('ar-support', e => { arBtn.style.display = ((e.detail && e.detail.ok) || !wide()) ? '' : 'none'; });
document.addEventListener('xr-support', e => { portal.style.display = ((e.detail && e.detail.ok) || wide()) ? '' : 'none'; });
arBtn.style.display = 'none';

// Kebijakan browser melarang suara tanpa gestur — jadi kalau dulu pengguna
// menyalakannya, ia dinyalakan lagi pada sentuhan pertama, bukan saat muat.
if (localStorage.getItem('si.audio') === 'on') {
  const arm = () => {
    removeEventListener('pointerdown', arm, true);
    removeEventListener('keydown', arm, true);
    if (!ambience.isOn()) ambience.toggle();
  };
  addEventListener('pointerdown', arm, true);
  addEventListener('keydown', arm, true);
}

// tutup panduan saat pengguna mulai mengemudi
addEventListener('pointerdown', e => {
  if (e.target.closest && (e.target.closest('.hud-info') || e.target.closest('[data-hud-btn="info"]'))) return;
  info.toggleInfo(false);
}, true);

/* ---------- denyut ---------- */

// Peta orbit tidak perlu 60 fps: 25 kali per detik sudah terasa hidup dan
// menyisakan anggaran frame untuk yang menggambar tata suryanya.
let mapT = 0;
const tick = () => {
  requestAnimationFrame(tick);
  const s = scene();
  if (!s || !s.systemMap) return;
  if (document.documentElement.classList.contains('mt-on')) return;
  if (document.documentElement.classList.contains('hud-focus')) return;
  const now = performance.now();
  if (now - mapT < 40) return;
  mapT = now;
  const m = s.systemMap();
  orrery.draw(m);
  orrery.readout(m);
};
requestAnimationFrame(tick);

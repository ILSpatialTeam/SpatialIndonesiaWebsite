// Organisme: kartu pos orbit.
//
// Menangkap pandangan lewat `snapshot()` milik scene, lalu menyusunnya jadi
// kartu beserta koordinat, jam WIB, dan rasi yang sedang di atas ufuk. Semua
// penyusunan terjadi di kanvas sendiri — scene tidak tahu-menahu.
import { el } from '../atoms/el.js';
import { scene } from '../../core/dom.js';
import { signal } from './signals.js';
import { tanggalID as tanggal } from '../../data/panels.js';

export const css = `/* -- kartu pos orbit -- */
.hud-card { position: absolute; inset: 0; display: none; place-items: center; padding: 22px; background: rgba(6,5,9,.82); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); pointer-events: auto; }

.hud-card.on { display: grid; animation: hudSig .35s ease both; }

.hud-card .wrap { display: flex; flex-direction: column; align-items: center; gap: 14px; max-width: min(760px, 100%); }

.hud-card img { display: block; width: 100%; height: auto; border-radius: 10px; box-shadow: 0 0 0 1px rgba(158,148,249,.28), 0 30px 80px rgba(0,0,0,.6); }

.hud-card .row { display: flex; gap: 9px; flex-wrap: wrap; justify-content: center; }

.hud-card .note { font-family: var(--hud-mono); font-size: 9px; letter-spacing: .2em; color: var(--hud-dim); text-align: center; }

@media (max-width: 779px) {
  .hud-card { padding: 14px; }
}`;

const cardImg = el('img', { alt: 'Kartu pos orbit' });
const cardNote = el('div', { class: 'note' });
export const node = el('div', { class: 'hud-card', 'data-hud-el': 'card' }, [
  el('div', { class: 'wrap' }, [
    cardImg,
    el('div', { class: 'row' }, [
      el('button', { class: 'go', text: 'DOWNLOAD PNG', onclick: () => downloadCard() }),
      el('button', { class: 'go ghost', text: 'SHARE', onclick: () => shareCard() }),
      el('button', { class: 'go ghost', text: 'CLOSE', onclick: () => node.classList.remove('on') })
    ]),
    cardNote
  ])
]);
node.addEventListener('click', e => { if (e.target === cardModal) node.classList.remove('on'); });

const mark = new Image();
mark.src = 'assets/si-mark-3x.png';
let cardCanvas = null;

const composeCard = shot => new Promise(done => {
  const W = 1600, H = 1000;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const img = new Image();
  img.onload = () => {
    // penuhi bingkai tanpa menggepengkan tangkapan layar
    const k = Math.max(W / img.width, H / img.height);
    const w = img.width * k, h = img.height * k;
    g.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);

    const grad = g.createLinearGradient(0, H * 0.42, 0, H);
    grad.addColorStop(0, 'rgba(8,6,12,0)');
    grad.addColorStop(1, 'rgba(8,6,12,.92)');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);

    // bingkai halus dengan siku, bahasa visual yang sama dengan situsnya
    g.strokeStyle = 'rgba(243,242,248,.22)';
    g.lineWidth = 2;
    g.strokeRect(30, 30, W - 60, H - 60);
    g.strokeStyle = 'rgba(158,148,249,.9)';
    g.lineWidth = 3;
    [[30, 30, 1, 1], [W - 30, 30, -1, 1], [30, H - 30, 1, -1], [W - 30, H - 30, -1, -1]].forEach(([x, y, sx, sy]) => {
      g.beginPath();
      g.moveTo(x + 46 * sx, y); g.lineTo(x, y); g.lineTo(x, y + 46 * sy);
      g.stroke();
    });

    const s = scene();
    const m = s && s.systemMap ? s.systemMap() : null;
    const sky = s && s.skyReport ? s.skyReport() : { clock: '', items: [] };
    const up = sky.items.filter(i => i.up).map(i => i.name.toUpperCase());
    const now = new Date();

    g.textAlign = 'left';
    g.fillStyle = 'rgba(169,155,242,.9)';
    g.font = "400 20px 'IBM Plex Mono', ui-monospace, monospace";
    g.fillText('ORBIT POSTCARD', 74, 92);

    if (mark.complete && mark.naturalWidth) g.drawImage(mark, 74, H - 168, 52, 52);
    g.fillStyle = '#f6f3ff';
    g.font = "600 40px 'Poppins', system-ui, sans-serif";
    g.fillText('Spatial Indonesia', 142, H - 128);
    g.fillStyle = 'rgba(185,180,204,.9)';
    g.font = "400 20px 'IBM Plex Mono', ui-monospace, monospace";
    g.fillText('SPATIAL SOLAR SYSTEM · SPATIALINDONESIA.ID', 142, H - 96);

    g.textAlign = 'right';
    g.fillStyle = '#f6f3ff';
    g.font = "400 22px 'IBM Plex Mono', ui-monospace, monospace";
    const km = m ? (m.dist * 1.4e3).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' KM' : '';
    g.fillText((m && m.target ? m.target.toUpperCase() : 'FREE ORBIT') + ' · ' + km, W - 74, H - 128);
    g.fillStyle = 'rgba(185,180,204,.8)';
    g.font = "400 19px 'IBM Plex Mono', ui-monospace, monospace";
    g.fillText(tanggal(now.toISOString().slice(0, 10)).toUpperCase() + (sky.clock ? ' · ' + sky.clock + ' WIB' : ''), W - 74, H - 96);
    if (up.length) {
      g.fillStyle = 'rgba(169,155,242,.85)';
      g.fillText(up.slice(0, 3).join(' · ') + ' ABOVE THE HORIZON', W - 74, H - 66);
    }
    done(c);
  };
  img.onerror = () => done(null);
  img.src = shot;
});

export const makeCard = async () => {
  const s = scene();
  const shot = s && s.snapshot ? s.snapshot() : null;
  if (!shot) { signal('Postcard could not be captured from this session.', 'warn'); return; }
  const c = await composeCard(shot);
  if (!c) { signal('Failed to compose the postcard.', 'warn'); return; }
  cardCanvas = c;
  cardImg.src = c.toDataURL('image/png');
  cardNote.textContent = 'YOUR VIEW, SAVED WITH COORDINATES AND TONIGHT\'S SKY';
  node.classList.add('on');
};

const downloadCard = () => {
  if (!cardCanvas) return;
  const a = el('a', { href: cardCanvas.toDataURL('image/png'), download: 'kartu-pos-orbit.png' });
  document.body.appendChild(a);
  a.click();
  a.remove();
};

const shareCard = async () => {
  if (!cardCanvas) return;
  try {
    const blob = await new Promise(r => cardCanvas.toBlob(r, 'image/png'));
    const file = new File([blob], 'kartu-pos-orbit.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Tata surya Spatial Indonesia' });
    } else {
      downloadCard();
    }
  } catch (e) { /* dibatalkan pengguna */ }
};

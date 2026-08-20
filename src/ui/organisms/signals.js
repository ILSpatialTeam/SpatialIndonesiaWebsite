// Organisme: tumpukan transmisi.
//
// Satu-satunya cara sistem lain berbicara kepada pengguna. Modul mana pun bisa
// memanggil `signal()` tanpa tahu di mana kartunya muncul atau seperti apa
// bentuknya — itu urusan berkas ini sendiri.
import { el } from '../atoms/el.js';

export const css = `html.mt-on .hud-signals { opacity: 1; pointer-events: none; }

/* -- transmisi: pesan sistem yang benar-benar terlihat -- */
.hud-signals { position: absolute; top: 22px; left: 50%; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; gap: 8px; width: min(430px, calc(100vw - 32px)); pointer-events: none; }

.hud-sig {
  position: relative; width: 100%; display: flex; align-items: flex-start; gap: 13px;
  padding: 13px 16px 13px 15px; border-radius: 13px; pointer-events: auto; cursor: pointer;
  background: rgba(12,10,16,.9); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
  box-shadow: 0 0 0 1px rgba(158,148,249,.22), 0 18px 48px rgba(0,0,0,.5);
  animation: hudSig .5s cubic-bezier(.2,.7,.2,1) both;
}

.hud-sig.warn { box-shadow: 0 0 0 1px rgba(255,138,61,.4), 0 18px 48px rgba(0,0,0,.5); }

.hud-sig.out { animation: hudSigOut .4s ease forwards; }

.hud-sig .beacon { position: relative; flex: 0 0 auto; width: 18px; height: 18px; margin-top: 1px; }

.hud-sig .beacon b { position: absolute; inset: 6px; border-radius: 50%; background: var(--hud-mint); box-shadow: 0 0 10px rgba(169,155,242,.9); }

.hud-sig .beacon i { position: absolute; inset: 0; border-radius: 50%; border: 1px solid rgba(169,155,242,.6); animation: hudPing 1.9s ease-out infinite; }

.hud-sig .beacon i:nth-child(3) { animation-delay: .95s; }

.hud-sig.warn .beacon b { background: var(--hud-hot); box-shadow: 0 0 10px rgba(255,138,61,.9); }

.hud-sig.warn .beacon i { border-color: rgba(255,138,61,.6); }

.hud-sig .body { min-width: 0; }

.hud-sig .k { display: block; margin-bottom: 4px; font-family: var(--hud-mono); font-size: 8.5px; letter-spacing: .24em; color: var(--hud-dim); }

.hud-sig.warn .k { color: var(--hud-hot); }

.hud-sig .m { font-size: 12px; line-height: 1.5; color: #cfcadd; }

@keyframes hudSig { from { opacity: 0; transform: translateY(-14px) scale(.96); } to { opacity: 1; transform: none; } }

@keyframes hudSigOut { to { opacity: 0; transform: translateY(-10px) scale(.98); } }

@keyframes hudPing { 0% { opacity: .8; transform: scale(.55); } 100% { opacity: 0; transform: scale(1.9); } }

@media (max-width: 779px) {
  .hud-signals { top: calc(74px + env(safe-area-inset-top)); }
}`;

export const node = el('div', { class: 'hud-signals', 'data-hud-el': 'signals' });
const WARN = /gagal|galat|tidak|belum|ditolak|terkunci|butuh|error|blocked|tutup dulu/i;

export const signal = (msg, kind) => {
  if (!msg) return;
  const warn = kind === 'warn' || (kind === undefined && WARN.test(msg));
  const card = el('div', { class: 'hud-sig' + (warn ? ' warn' : '') }, [
    el('span', { class: 'beacon' }, [el('b'), el('i'), el('i')]),
    el('span', { class: 'body' }, [
      el('span', { class: 'k', text: warn ? 'PERINGATAN SISTEM' : 'TRANSMISI' }),
      el('span', { class: 'm', text: msg })
    ])
  ]);
  const close = () => {
    if (card.dataset.gone) return;
    card.dataset.gone = '1';
    card.classList.add('out');
    setTimeout(() => card.remove(), 420);
  };
  card.addEventListener('click', close);
  node.appendChild(card);
  while (node.children.length > 3) node.firstChild.remove();
  setTimeout(close, warn ? 13000 : 7500);
};


// Mode Meteor — pertahanan tata surya.
//
// Situs berhenti jadi situs. Semua chrome (rencana penerbangan, ajakan
// menjelajah, indikator kecepatan, pemilih kursor, panel) padam, kursor dikunci
// ke bidikan, dan yang tersisa cuma langit yang mengirim batu. Tiap meteor yang
// menghantam planet menggerus integritas sistem; tiap yang kamu tembak menambah
// skor, dan skor itulah yang memanggil gelombang berikutnya.
//
// Logika 3D-nya (spawn, tabrakan, laser, VR) tinggal di solar.js. Berkas ini
// hanya kepala-dinginnya: HUD, suara, dan saklar masuk-keluar. Seperti
// insight-reader.js, seluruh DOM-nya dipasang ke document.body, di luar pohon
// React milik Design Canvas, supaya tidak ikut ter-render ulang.

import { audioContext, noiseSource } from '../../core/audio.js';

const el = (tag, attrs, kids) => {
  const n = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    if (k === 'class') n.className = attrs[k];
    else if (k === 'text') n.textContent = attrs[k];
    else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), attrs[k]);
    else if (attrs[k] !== null && attrs[k] !== undefined) n.setAttribute(k, attrs[k]);
  }
  (kids || []).forEach(c => c && n.appendChild(c));
  return n;
};
const scene = () => document.querySelector('solar-system');
const fine = () => matchMedia('(pointer: fine)').matches && innerWidth >= 780;

/* ---------- gaya ---------- */

const CSS = `
/* selama mode meteor, situsnya diam: semua yang bisa diklik atau dibaca padam,
   tapi tetap dibiarkan di tempatnya supaya tata letak tidak melompat saat keluar */
html.mt-on [data-ui="flightplan"], html.mt-on [data-ui="readout"],
html.mt-on [data-ui="xrline"], html.mt-on [data-ui="hints"],
html.mt-on [data-ui="cursorpick"], html.mt-on [data-planet-label],
html.mt-on [data-intro], html.mt-on [data-panel], html.mt-on [data-insight-panel],
html.mt-on [data-ui="arbtn"], html.mt-on [data-ui="mode"], html.mt-on [data-ui="brandtag"],
html.mt-on .pn-root, html.mt-on [data-ui="cursor"] {
  opacity: 0 !important; pointer-events: none !important; transition: opacity .45s;
}
html.mt-on [data-ui="vignette"] { background: radial-gradient(72% 62% at 50% 50%, transparent 38%, rgba(24,8,4,.5) 100%) !important; }
html.mt-on, html.mt-on body, html.mt-on * { cursor: none !important; }

.mt-root {
  --paper: #f3f2f8; --muted: #8f8aa3; --hot: #ff8a3d; --burn: #ff5a3d; --iris: #9E94F9;
  --mono: 'IBM Plex Mono', ui-monospace, SFMono-Regular, monospace;
  position: fixed; inset: 0; z-index: 44; pointer-events: none; color: var(--paper);
  font-family: 'Instrument Sans', system-ui, sans-serif; display: none;
}
.mt-root.on { display: block; }

/* -- kokpit --
   Bukan dasbor bergambar: cukup rangka kaca, dua tiang kanopi, dan konsol
   bawah yang menyala. Semuanya masuk dari tepi layar saat kamu naik, jadi
   perpindahan modenya terasa seperti duduk di kursi, bukan seperti tombol. */
.mt-pit { position: absolute; inset: 0; pointer-events: none; }
.mt-pit .canopy {
  position: absolute; inset: 0;
  box-shadow: inset 0 0 116px 14px rgba(10,4,2,.58), inset 0 0 0 1px rgba(255,138,61,.16);
  -webkit-clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
}
.mt-root.on .mt-pit .canopy { animation: pitSeal .9s cubic-bezier(.2,.7,.2,1) .28s both; }
.mt-pit .strut { position: absolute; top: 0; bottom: 0; width: 94px; background: linear-gradient(90deg, rgba(22,18,26,.96), rgba(22,18,26,.5) 62%, transparent); }
.mt-pit .strut::after { content: ''; position: absolute; top: 0; bottom: 0; width: 1px; background: linear-gradient(180deg, transparent, rgba(255,138,61,.42) 22%, rgba(255,138,61,.42) 78%, transparent); }
.mt-pit .strut.l { left: 0; -webkit-clip-path: polygon(0 0, 100% 0, 62% 100%, 0 100%); clip-path: polygon(0 0, 100% 0, 62% 100%, 0 100%); }
.mt-pit .strut.l::after { right: 0; }
.mt-pit .strut.r { right: 0; transform: scaleX(-1); -webkit-clip-path: polygon(0 0, 100% 0, 62% 100%, 0 100%); clip-path: polygon(0 0, 100% 0, 62% 100%, 0 100%); }
.mt-pit .strut.r::after { right: 0; }
.mt-root.on .mt-pit .strut.l { animation: strutL .8s cubic-bezier(.2,.7,.2,1) .34s both; }
.mt-root.on .mt-pit .strut.r { animation: strutR .8s cubic-bezier(.2,.7,.2,1) .34s both; }
.mt-pit .dash {
  position: absolute; left: -6%; right: -6%; bottom: -34px; height: 116px;
  border-radius: 50% 50% 0 0 / 78px 78px 0 0;
  background: linear-gradient(180deg, rgba(24,19,28,.9), rgba(12,9,14,.99));
  border-top: 1px solid rgba(255,138,61,.34);
  box-shadow: 0 -18px 46px rgba(255,110,44,.09);
}
.mt-root.on .mt-pit .dash { animation: dashUp .9s cubic-bezier(.2,.7,.2,1) .34s both; }
.mt-pit .lamp { position: absolute; bottom: 20px; width: 5px; height: 5px; border-radius: 50%; background: #ff8a3d; box-shadow: 0 0 10px rgba(255,138,61,.9); opacity: .75; }
.mt-pit .lamp.a { left: 34%; animation: lampBlink 2.6s ease-in-out infinite; }
.mt-pit .lamp.b { right: 34%; background: #9E94F9; box-shadow: 0 0 10px rgba(158,148,249,.9); animation: lampBlink 2.6s ease-in-out .9s infinite; }
.mt-pit .sheen { position: absolute; inset: 0; background: linear-gradient(114deg, transparent 34%, rgba(200,214,255,.05) 46%, transparent 58%); }
.mt-root.on .mt-pit .sheen { animation: pitSheen 9s ease-in-out infinite; }

@keyframes pitSeal { from { opacity: 0; transform: scale(1.06); } to { opacity: 1; transform: none; } }
@keyframes strutL { from { transform: translateX(-100%); } to { transform: none; } }
@keyframes strutR { from { transform: scaleX(-1) translateX(-100%); } to { transform: scaleX(-1); } }
@keyframes dashUp { from { transform: translateY(120px); opacity: 0; } to { transform: none; opacity: 1; } }
@keyframes lampBlink { 0%, 100% { opacity: .28; } 50% { opacity: 1; } }
@keyframes pitSheen { 0%, 100% { transform: translateX(-12%); } 50% { transform: translateX(12%); } }

/* -- penyalaan: kanopi menutup, sistem dicek, lalu siap -- */
.mt-boot { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
.mt-root.armed .mt-boot { display: none; }
.mt-boot .shut { position: absolute; left: 0; right: 0; height: 52%; background: #08060b; border-color: rgba(255,138,61,.5); }
.mt-boot .shut.t { top: 0; border-bottom: 1px solid; }
.mt-boot .shut.b { bottom: 0; border-top: 1px solid; }
.mt-boot.full .shut.t { animation: shutT .95s cubic-bezier(.4,0,.2,1) both; }
.mt-boot.full .shut.b { animation: shutB .95s cubic-bezier(.4,0,.2,1) both; }
.mt-boot.quick .shut { display: none; }
@keyframes shutT { 0% { transform: translateY(-100%); } 26%, 42% { transform: none; } 100% { transform: translateY(-100%); } }
@keyframes shutB { 0% { transform: translateY(100%); } 26%, 42% { transform: none; } 100% { transform: translateY(100%); } }

.mt-boot .card { position: relative; width: min(430px, calc(100vw - 44px)); padding: 24px 26px 22px; border: 1px solid rgba(255,138,61,.28); border-radius: 14px; background: rgba(12,9,14,.86); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); text-align: left; }
.mt-boot.full .card { animation: bootCard .5s cubic-bezier(.2,.7,.2,1) .46s both, bootOut .34s ease 2.06s both; }
.mt-boot.quick .card { animation: bootCard .3s cubic-bezier(.2,.7,.2,1) both, bootOut .3s ease .74s both; }
.mt-boot .ship { font-family: var(--mono); font-size: 9.5px; letter-spacing: .3em; color: var(--hot); }
.mt-boot .ttl { margin: 8px 0 18px; font-family: 'Poppins', sans-serif; font-size: 20px; letter-spacing: .01em; }
.mt-boot.quick .ttl, .mt-boot.quick .chk, .mt-boot.quick .bar { display: none; }
.mt-boot .chk { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 9px; }
.mt-boot .chk li { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; font-family: var(--mono); font-size: 10.5px; letter-spacing: .16em; color: var(--muted); opacity: 0; }
.mt-boot.full .chk li { animation: chkIn .34s ease both; animation-delay: calc(.62s + var(--i) * .26s); }
.mt-boot .chk i { font-style: normal; color: var(--hot); }
.mt-boot .chk li::after { content: ''; position: absolute; }
.mt-boot .bar { position: relative; height: 1px; margin-top: 20px; background: rgba(243,242,248,.12); overflow: hidden; }
.mt-boot .bar i { position: absolute; inset: 0 auto 0 0; width: 100%; background: linear-gradient(90deg, var(--hot), var(--iris)); transform-origin: left; }
.mt-boot.full .bar i { animation: bootBar 1.32s cubic-bezier(.3,.6,.2,1) .5s both; }
.mt-boot .ready { margin-top: 16px; font-family: 'Poppins', sans-serif; font-size: 15px; letter-spacing: .22em; color: #f3f2f8; opacity: 0; }
.mt-boot.full .ready { animation: readyIn .5s cubic-bezier(.2,.7,.2,1) 1.72s both; }
.mt-boot.quick .ready { margin: 0; animation: readyIn .4s cubic-bezier(.2,.7,.2,1) .12s both; }
@keyframes bootCard { from { opacity: 0; transform: translateY(14px) scale(.97); } to { opacity: 1; transform: none; } }
@keyframes bootOut { to { opacity: 0; transform: scale(1.02); } }
@keyframes chkIn { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: none; } }
@keyframes bootBar { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes readyIn { from { opacity: 0; letter-spacing: .5em; } to { opacity: 1; letter-spacing: .22em; } }

/* HUD dan petunjuk baru muncul setelah kokpit siap */
.mt-root:not(.armed) .mt-hud, .mt-root:not(.armed) .mt-tip { display: none; }

/* -- panel integritas -- */
.mt-hud {
  position: absolute; top: 92px; left: 50%; transform: translateX(-50%);
  display: flex; align-items: center; gap: 22px; padding: 12px 20px;
  border: 1px solid rgba(255,138,61,.34); border-radius: 14px;
  background: rgba(18,17,22,.66); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  animation: mtInX .5s cubic-bezier(.2,.7,.2,1) both;
}
@keyframes mtInX { from { opacity: 0; transform: translateX(-50%) translateY(-10px); } to { opacity: 1; transform: translateX(-50%); } }
.mt-hud .lab { font-size: 9px; letter-spacing: .22em; color: var(--muted); display: block; margin-bottom: 6px; white-space: nowrap; }
.mt-hp { min-width: 260px; }
.mt-bar { position: relative; height: 9px; border-radius: 999px; background: rgba(243,242,248,.1); overflow: hidden; }
.mt-bar i { position: absolute; inset: 0 auto 0 0; width: 100%; border-radius: 999px; background: linear-gradient(90deg, #6a5ae0, #9E94F9); transition: width .3s cubic-bezier(.2,.7,.2,1), background .3s; }
.mt-bar.warn i { background: linear-gradient(90deg, #c9762f, #ffb066); }
.mt-bar.crit i { background: linear-gradient(90deg, #b32d1c, #ff5a3d); }
.mt-bar b { position: absolute; inset: 0; display: block; background: rgba(255,255,255,.9); opacity: 0; }
.mt-bar.flash b { animation: mtBarFlash .38s ease-out; }
.mt-num { font-family: 'Poppins', sans-serif; font-size: 17px; line-height: 1; }
.mt-num.hp { color: var(--iris); }
.mt-hud.crit .mt-num.hp { color: var(--burn); }
.mt-num.score { color: var(--hot); }
.mt-num.wave { color: var(--paper); }
.mt-statsrow { display: flex; align-items: center; gap: 22px; }
.mt-sep { width: 1px; height: 28px; background: rgba(243,242,248,.12); }
.mt-mute {
  pointer-events: auto; width: 30px; height: 30px; display: grid; place-items: center;
  border: 1px solid rgba(243,242,248,.16); border-radius: 8px; background: transparent;
  color: var(--muted); font-family: var(--mono); font-size: 12px; cursor: none;
}
.mt-mute:hover { border-color: var(--hot); color: var(--hot); }

/* -- bidikan -- */
.mt-aim { position: fixed; left: 0; top: 0; z-index: 70; width: 84px; height: 84px; margin: -42px 0 0 -42px; pointer-events: none; display: none; will-change: transform; }
.mt-aim .ring { position: absolute; inset: 22px; border: 1px solid rgba(255,138,61,.75); border-radius: 50%; transition: inset .18s, border-color .18s; }
.mt-aim .sweep { position: absolute; inset: 8px; border-radius: 50%; border: 1px dashed rgba(255,138,61,.32); animation: mtSpin 7s linear infinite; }
.mt-aim .t { position: absolute; background: #ff8a3d; transition: background .18s; }
.mt-aim .t.n { left: 50%; top: 0; width: 1px; height: 16px; margin-left: -.5px; }
.mt-aim .t.s { left: 50%; bottom: 0; width: 1px; height: 16px; margin-left: -.5px; }
.mt-aim .t.w { top: 50%; left: 0; height: 1px; width: 16px; margin-top: -.5px; }
.mt-aim .t.e { top: 50%; right: 0; height: 1px; width: 16px; margin-top: -.5px; }
.mt-aim .dot { position: absolute; left: 50%; top: 50%; width: 3px; height: 3px; margin: -1.5px 0 0 -1.5px; border-radius: 50%; background: #fff; }
.mt-aim.lock .ring { inset: 14px; border-color: var(--burn); box-shadow: 0 0 18px rgba(255,90,61,.5); }
.mt-aim.lock .t { background: var(--burn); }
.mt-aim.fire .ring { animation: mtKick .12s ease-out; }

/* -- umpan balik -- */
.mt-tap { position: fixed; left: 0; top: 0; width: 74px; height: 74px; margin: -37px 0 0 -37px; border: 1px solid rgba(255,138,61,.9); border-radius: 50%; opacity: 0; pointer-events: none; z-index: 70; }
.mt-tap.on { animation: mtTap .42s cubic-bezier(.2,.7,.2,1); }
@keyframes mtTap { 0% { opacity: .95; transform: scale(.3); } 100% { opacity: 0; transform: scale(1); } }
.mt-flash { position: absolute; inset: 0; opacity: 0; background: radial-gradient(circle at 50% 50%, transparent 24%, rgba(255,58,26,.55) 100%); }
.mt-flash.on { animation: mtHit .5s ease-out; }
.mt-wave { position: absolute; top: 42%; left: 50%; transform: translate(-50%, -50%); text-align: center; opacity: 0; }
.mt-wave.on { animation: mtWave 1.7s cubic-bezier(.2,.7,.2,1); }
.mt-wave .k { font-size: 10px; letter-spacing: .4em; color: var(--hot); }
.mt-wave .v { font-family: 'Poppins', sans-serif; font-size: 46px; letter-spacing: .04em; margin-top: 6px; }
.mt-tip { position: absolute; bottom: 34px; left: 50%; transform: translateX(-50%); font-size: 10.5px; letter-spacing: .2em; color: var(--muted); white-space: nowrap; }

/* -- akhir permainan -- */
.mt-over {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
  display: none; flex-direction: column; align-items: center; gap: 4px; width: min(400px, calc(100vw - 40px));
  padding: 34px 30px 28px; border: 1px solid rgba(255,90,61,.4); border-radius: 16px;
  background: rgba(18,17,22,.92); backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
  text-align: center; pointer-events: auto;
}
.mt-over.on { display: flex; animation: mtIn .5s cubic-bezier(.2,.7,.2,1) both; }
.mt-over h2 { margin: 0; font-family: 'Poppins', sans-serif; font-weight: 600; font-size: 27px; color: var(--burn); }
.mt-over p { margin: 8px 0 22px; font-size: 13px; line-height: 1.6; color: #b9b4cc; }
.mt-stats { display: flex; gap: 26px; margin-bottom: 26px; }
.mt-stats div { display: flex; flex-direction: column; gap: 6px; }
.mt-stats span { font-size: 9px; letter-spacing: .2em; color: var(--muted); }
.mt-stats b { font-family: 'Poppins', sans-serif; font-weight: 500; font-size: 24px; }
.mt-acts { display: flex; gap: 10px; width: 100%; }
.mt-acts button { flex: 1; padding: 12px 14px; border-radius: 999px; font-family: 'Instrument Sans', sans-serif; font-size: 12.5px; font-weight: 600; letter-spacing: .06em; cursor: none; }
.mt-again { border: none; background: var(--hot); color: #121116; }
.mt-again:hover { background: #ffa25e; }
.mt-quit { border: 1px solid rgba(243,242,248,.2); background: transparent; color: var(--paper); }
.mt-quit:hover { border-color: var(--iris); color: var(--iris); }

@keyframes mtIn { from { opacity: 0; transform: translate(-50%, -50%) scale(.94); } to { opacity: 1; } }
@keyframes mtSpin { to { transform: rotate(360deg); } }
@keyframes mtHit { 0% { opacity: 0 } 12% { opacity: 1 } 100% { opacity: 0 } }
@keyframes mtBarFlash { 0% { opacity: .85 } 100% { opacity: 0 } }
@keyframes mtKick { 0% { transform: scale(1) } 50% { transform: scale(1.28) } 100% { transform: scale(1) } }
@keyframes mtWave { 0% { opacity: 0; transform: translate(-50%, -50%) scale(.9); } 18% { opacity: 1; transform: translate(-50%, -50%) scale(1); } 74% { opacity: 1; } 100% { opacity: 0; transform: translate(-50%, -50%) scale(1.04); } }

@media (max-width: 780px) {
  /* kartu HUD melar selebar layar dan statistiknya turun satu baris — dijejalkan
     dalam satu baris, labelnya sendiri sudah lebih lebar dari layar ponsel */
  .mt-hud {
    top: calc(78px + env(safe-area-inset-top)); left: 10px; right: 10px; transform: none;
    flex-wrap: wrap; gap: 7px 10px; padding: 9px 13px; border-radius: 12px;
    /* animasi masuknya ikut diganti: keyframe versi lebar menahan
       translateX(-50%) lewat fill mode, dan itu mengalahkan transform di sini */
    animation-name: mtInY;
  }
  @keyframes mtInY { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: none; } }
  .mt-hp { flex: 1 1 110px; min-width: 0; }
  .mt-num { font-size: 13px; }
  .mt-num.hp { margin-left: auto; }
  .mt-hud .lab { font-size: 7.5px; letter-spacing: .11em; margin-bottom: 4px; }
  .mt-sep { display: none; }
  .mt-statsrow { flex: 1 0 100%; justify-content: space-between; gap: 8px; }
  .mt-mute { display: none; }
  .mt-tip {
    left: 16px; right: 16px; bottom: calc(16px + env(safe-area-inset-bottom)); transform: none;
    white-space: normal; line-height: 1.6; font-size: 9.5px; letter-spacing: .1em;
  }
  .mt-wave .v { font-size: 34px; }
  .mt-pit .strut { width: 58px; }
  .mt-pit .dash { height: 76px; bottom: -26px; border-radius: 50% 50% 0 0 / 52px 52px 0 0; }
  .mt-pit .lamp { bottom: 14px; }
  .mt-pit .canopy { box-shadow: inset 0 0 74px 10px rgba(10,4,2,.55), inset 0 0 0 1px rgba(255,138,61,.16); }
  .mt-boot .card { padding: 20px 18px 18px; border-radius: 12px; }
  .mt-boot .ttl { font-size: 17px; margin-bottom: 15px; }
  .mt-boot .chk li { font-size: 9.5px; letter-spacing: .12em; }
  .mt-boot .ready { font-size: 13px; }
  .mt-over { padding: 26px 20px 22px; border-radius: 14px; }
  .mt-over h2 { font-size: 23px; }
  .mt-over p { margin: 8px 0 18px; font-size: 12.5px; }
  .mt-stats { gap: 16px; margin-bottom: 20px; }
  .mt-stats b { font-size: 21px; }
  .mt-stats span { font-size: 8px; letter-spacing: .14em; }
  .mt-acts button { padding: 12px 10px; font-size: 11.5px; letter-spacing: .04em; }
}
`;

/* ---------- rangka ---------- */

const bar = el('i');
const barFlash = el('b');
const barWrap = el('div', { class: 'mt-bar' }, [bar, barFlash]);
const hpNum = el('span', { class: 'mt-num hp', text: '100%' });
const scoreNum = el('span', { class: 'mt-num score', text: '0000' });
const waveNum = el('span', { class: 'mt-num wave', text: '01' });
const killNum = el('span', { class: 'mt-num wave', text: '00' });
const muteBtn = el('button', { class: 'mt-mute', text: '♪', title: 'Suara' });

const statsRow = el('div', { class: 'mt-statsrow' }, [
  el('div', {}, [el('span', { class: 'lab', text: 'SCORE' }), scoreNum]),
  el('div', {}, [el('span', { class: 'lab', text: 'WAVE' }), waveNum]),
  el('div', {}, [el('span', { class: 'lab', text: 'KILLS' }), killNum])
]);

const hud = el('div', { class: 'mt-hud' }, [
  el('div', { class: 'mt-hp' }, [el('span', { class: 'lab', text: 'SYSTEM INTEGRITY' }), barWrap]),
  hpNum,
  el('span', { class: 'mt-sep' }),
  statsRow,
  muteBtn
]);

const waveV = el('div', { class: 'v', text: 'WAVE 01' });
const waveBanner = el('div', { class: 'mt-wave' }, [el('div', { class: 'k', text: 'THREAT INCREASING' }), waveV]);
const flash = el('div', { class: 'mt-flash' });
const tip = el('div', { class: 'mt-tip' });

const ovScore = el('b', { text: '0' });
const ovWave = el('b', { text: '1' });
const ovKill = el('b', { text: '0' });
const over = el('div', { class: 'mt-over' }, [
  el('h2', { text: 'SYSTEM DOWN' }),
  el('p', { text: 'Meteors breached the defenses. The Spatial solar system needs a new gunner.' }),
  el('div', { class: 'mt-stats' }, [
    el('div', {}, [el('span', { text: 'SCORE' }), ovScore]),
    el('div', {}, [el('span', { text: 'WAVE' }), ovWave]),
    el('div', {}, [el('span', { text: 'KILLS' }), ovKill])
  ]),
  el('div', { class: 'mt-acts' }, [
    el('button', { class: 'mt-again', text: 'PLAY AGAIN', onclick: () => { const s = scene(); if (s) s.restartMeteor(); } }),
    el('button', { class: 'mt-quit', text: 'EXIT MODE', onclick: () => { const s = scene(); if (s) s.setMeteorMode(false); } })
  ])
]);

const pit = el('div', { class: 'mt-pit' }, [
  el('span', { class: 'canopy' }),
  el('span', { class: 'strut l' }),
  el('span', { class: 'strut r' }),
  el('span', { class: 'dash' }),
  el('span', { class: 'lamp a' }),
  el('span', { class: 'lamp b' }),
  el('span', { class: 'sheen' })
]);

// daftar periksa sebelum lepas landas — urutannya diatur CSS lewat --i
const CHECKS = [
  ['MAIN REACTOR', 'ACTIVE'],
  ['LASER CANNON', 'CALIBRATED'],
  ['PLANETARY SHIELD', 'ONLINE'],
  ['METEOR SCANNER', 'SWEEPING']
];
const boot = el('div', { class: 'mt-boot' }, [
  el('span', { class: 'shut t' }),
  el('span', { class: 'shut b' }),
  el('div', { class: 'card' }, [
    el('div', { class: 'ship', text: 'SI-01 · ORBIT GUARDIAN' }),
    el('div', { class: 'ttl', text: 'Defense protocol' }),
    el('ul', { class: 'chk' }, CHECKS.map(([k, v], i) =>
      el('li', { style: '--i:' + i }, [el('span', { text: k }), el('i', { text: v })]))),
    el('div', { class: 'bar' }, [el('i')]),
    el('div', { class: 'ready', text: 'READY FOR BATTLE' })
  ])
]);

const tap = el('div', { class: 'mt-tap' });
const root = el('div', { class: 'mt-root' }, [pit, hud, waveBanner, flash, tip, over, boot]);
const aim = el('div', { class: 'mt-aim' }, [
  el('span', { class: 'sweep' }), el('span', { class: 'ring' }),
  el('span', { class: 't n' }), el('span', { class: 't s' }),
  el('span', { class: 't w' }), el('span', { class: 't e' }),
  el('span', { class: 'dot' })
]);

document.head.appendChild(el('style', { text: CSS }));
document.body.append(root, aim, tap);

/* ---------- suara ---------- */
// disintesis, bukan berkas: laser dan ledakan harus terdengar seketika dan
// tidak layak menambah unduhan

const sfx = (() => {
  let muted = false;
  const ac = audioContext;
  const noise = noiseSource;
  return {
    mute(v) { muted = v === undefined ? !muted : !!v; return muted; },
    muted() { return muted; },
    laser() {
      const c = muted ? null : ac();
      if (!c) return;
      const o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
      o.type = 'sawtooth';
      f.type = 'bandpass'; f.frequency.value = 1400; f.Q.value = 1.4;
      o.frequency.setValueAtTime(1500, c.currentTime);
      o.frequency.exponentialRampToValueAtTime(220, c.currentTime + 0.1);
      g.gain.setValueAtTime(0.09, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.12);
      o.connect(f); f.connect(g); g.connect(c.destination);
      o.start(); o.stop(c.currentTime + 0.13);
    },
    burst(deep) {
      const c = muted ? null : ac();
      if (!c) return;
      const src = noise(c, deep ? 0.5 : 0.3), g = c.createGain(), f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(deep ? 900 : 2600, c.currentTime);
      f.frequency.exponentialRampToValueAtTime(deep ? 90 : 320, c.currentTime + (deep ? 0.5 : 0.3));
      g.gain.setValueAtTime(deep ? 0.3 : 0.16, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + (deep ? 0.52 : 0.32));
      src.connect(f); f.connect(g); g.connect(c.destination);
      src.start();
      if (deep) {
        const o = c.createOscillator(), og = c.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(120, c.currentTime);
        o.frequency.exponentialRampToValueAtTime(38, c.currentTime + 0.45);
        og.gain.setValueAtTime(0.32, c.currentTime);
        og.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.5);
        o.connect(og); og.connect(c.destination);
        o.start(); o.stop(c.currentTime + 0.5);
      }
    },
    // dentum kanopi mengunci
    thud() {
      const c = muted ? null : ac();
      if (!c) return;
      const src = noise(c, 0.26), g = c.createGain(), f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(420, c.currentTime);
      f.frequency.exponentialRampToValueAtTime(70, c.currentTime + 0.25);
      g.gain.setValueAtTime(0.34, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.28);
      src.connect(f); f.connect(g); g.connect(c.destination);
      src.start();
    },
    // reaktor menyala: sapuan naik yang panjang
    sweep(f0, f1, dur) {
      const c = muted ? null : ac();
      if (!c) return;
      const o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
      o.type = 'sawtooth';
      f.type = 'lowpass'; f.Q.value = 6;
      f.frequency.setValueAtTime(f0 * 3, c.currentTime);
      f.frequency.exponentialRampToValueAtTime(f1 * 3, c.currentTime + dur);
      o.frequency.setValueAtTime(f0, c.currentTime);
      o.frequency.exponentialRampToValueAtTime(f1, c.currentTime + dur);
      g.gain.setValueAtTime(0.0001, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.07, c.currentTime + dur * 0.6);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
      o.connect(f); f.connect(g); g.connect(c.destination);
      o.start(); o.stop(c.currentTime + dur + 0.02);
    },
    // satu butir daftar periksa tercentang
    tick(freq) {
      const c = muted ? null : ac();
      if (!c) return;
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'triangle';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.1, c.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.16);
      o.connect(g); g.connect(c.destination);
      o.start(); o.stop(c.currentTime + 0.18);
    },
    // aba-aba siap bertempur
    chord() {
      const c = muted ? null : ac();
      if (!c) return;
      [392, 587, 784].forEach((f, i) => {
        const o = c.createOscillator(), g = c.createGain();
        o.type = 'triangle';
        o.frequency.value = f;
        const t0 = c.currentTime + i * 0.05;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.09, t0 + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.7);
        o.connect(g); g.connect(c.destination);
        o.start(t0); o.stop(t0 + 0.72);
      });
    },
    // deru mesin pelan selama kamu duduk di kokpit
    drone(want) {
      const c = (want && !muted) ? ac() : audioContext();
      if (!c) return;
      if (want && !muted) {
        if (this._drone) return;
        const g = c.createGain(), f = c.createBiquadFilter();
        f.type = 'lowpass'; f.frequency.value = 220;
        g.gain.setValueAtTime(0.0001, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.035, c.currentTime + 1.2);
        const os = [54, 55.6].map(hz => {
          const o = c.createOscillator();
          o.type = 'sawtooth';
          o.frequency.value = hz;
          o.connect(f);
          o.start();
          return o;
        });
        f.connect(g); g.connect(c.destination);
        this._drone = { os, g };
        return;
      }
      const d = this._drone;
      if (!d) return;
      this._drone = null;
      try {
        d.g.gain.cancelScheduledValues(c.currentTime);
        d.g.gain.setValueAtTime(Math.max(d.g.gain.value, 0.0001), c.currentTime);
        d.g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.5);
        d.os.forEach(o => o.stop(c.currentTime + 0.55));
      } catch (e) { d.os.forEach(o => { try { o.stop(); } catch (e2) {} }); }
    },
    blip(up) {
      const c = muted ? null : ac();
      if (!c) return;
      [0, 0.12].forEach((d, i) => {
        const o = c.createOscillator(), g = c.createGain();
        o.type = 'triangle';
        o.frequency.value = up ? (i ? 880 : 587) : (i ? 220 : 330);
        g.gain.setValueAtTime(0.0001, c.currentTime + d);
        g.gain.exponentialRampToValueAtTime(0.12, c.currentTime + d + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + d + 0.24);
        o.connect(g); g.connect(c.destination);
        o.start(c.currentTime + d); o.stop(c.currentTime + d + 0.26);
      });
    }
  };
})();

muteBtn.addEventListener('click', () => {
  const m = sfx.mute();
  sfx.drone(!m && on);
  muteBtn.textContent = m ? '✕' : '♪';
  muteBtn.style.borderColor = m ? 'rgba(243,242,248,.16)' : 'rgba(255,138,61,.5)';
  muteBtn.style.color = m ? '' : '#ff8a3d';
});

/* ---------- keadaan ---------- */

let on = false;

const setTip = () => {
  tip.textContent = fine()
    ? 'HOLD CLICK — SHOOT · DRAG TO EDGE OR A/D — ROTATE · ESC — EXIT'
    : 'TAP TO SHOOT · SWIPE TO LOOK AROUND';
};

const hudPaint = d => {
  const hp = Math.max(0, Math.round(d.health));
  bar.style.width = hp + '%';
  hpNum.textContent = hp + '%';
  barWrap.classList.toggle('warn', hp <= 50 && hp > 25);
  barWrap.classList.toggle('crit', hp <= 25);
  hud.classList.toggle('crit', hp <= 25);
  scoreNum.textContent = String(d.score).padStart(4, '0');
  waveNum.textContent = String(d.wave).padStart(2, '0');
  killNum.textContent = String(d.kills).padStart(2, '0');
};

// jadwal suara untuk urutan penyalaan; visualnya diurus CSS lewat delay
let beats = [];
const beat = (ms, fn) => beats.push(setTimeout(fn, ms));
const clearBeats = () => { beats.forEach(clearTimeout); beats = []; };

const bootSound = full => {
  clearBeats();
  if (!full) {
    beat(40, () => sfx.tick(720));
    beat(170, () => sfx.chord());
    return;
  }
  sfx.thud();                                   // kanopi mengunci
  beat(320, () => sfx.sweep(70, 380, 1.1));     // reaktor menyala
  [620, 880, 1140, 1400].forEach((ms, i) => beat(ms, () => sfx.tick(520 + i * 120)));
  beat(1720, () => sfx.chord());                // siap bertempur
};

// dipakai untuk masuk mode maupun mengulang permainan: bedanya cuma panjang
// urutan penyalaan yang dikirim scene
const start = e => {
  const arming = (e && e.detail && e.detail.arming) || 0;
  const full = arming > 1.5;
  on = true;
  document.documentElement.classList.add('mt-on');
  root.classList.add('on');
  root.classList.remove('armed');
  boot.classList.remove('full', 'quick');
  void boot.offsetWidth;                        // paksa animasinya mulai lagi
  boot.classList.add(full ? 'full' : 'quick');
  aim.style.display = 'none';
  over.classList.remove('on');
  setTip();
  waveV.textContent = 'WAVE 01';
  bootSound(full);
  // jaring pengaman: kalau scene sempat terhenti (tab pindah ke belakang saat
  // urutan berjalan), HUD tetap muncul dan tidak meninggalkan kokpit kosong
  beat(arming * 1000 + 400, armed);
};

// scene memberi aba-aba saat kokpit benar-benar siap; sampai saat itu HUD,
// bidikan, dan meteornya sendiri masih ditahan
const armed = () => {
  root.classList.add('armed');
  aim.classList.toggle('fine', fine());
  aim.style.display = fine() ? 'block' : 'none';
  sfx.drone(true);
};

const stop = () => {
  on = false;
  clearBeats();
  sfx.drone(false);
  document.documentElement.classList.remove('mt-on');
  root.classList.remove('on', 'armed');
  boot.classList.remove('full', 'quick');
  aim.style.display = 'none';
  over.classList.remove('on');
};

/* ---------- kabel ke scene ---------- */

document.addEventListener('meteor-start', start);
document.addEventListener('meteor-restart', start);
document.addEventListener('meteor-armed', armed);
document.addEventListener('meteor-end', stop);
document.addEventListener('meteor-hud', e => hudPaint(e.detail));

document.addEventListener('meteor-hit', () => {
  flash.classList.remove('on');
  void flash.offsetWidth;
  flash.classList.add('on');
  barWrap.classList.remove('flash');
  void barWrap.offsetWidth;
  barWrap.classList.add('flash');
  sfx.burst(true);
});

document.addEventListener('meteor-shot', e => {
  sfx.laser();
  if (e.detail && e.detail.hit) sfx.burst(false);
  aim.classList.remove('fire');
  void aim.offsetWidth;
  aim.classList.add('fire');
  // di layar sentuh tidak ada bidikan yang mengikuti jari, jadi titik tembaknya
  // ditandai di tempat ketukan tadi
  if (!fine()) {
    tap.style.left = ax + 'px';
    tap.style.top = ay + 'px';
    tap.classList.remove('on');
    void tap.offsetWidth;
    tap.classList.add('on');
  }
});

document.addEventListener('meteor-aim', e => {
  aim.classList.toggle('lock', !!(e.detail && e.detail.locked));
});

document.addEventListener('meteor-wave', e => {
  const w = (e.detail && e.detail.wave) || 1;
  waveV.textContent = 'WAVE ' + String(w).padStart(2, '0');
  waveBanner.classList.remove('on');
  void waveBanner.offsetWidth;
  waveBanner.classList.add('on');
  sfx.blip(true);
});

document.addEventListener('meteor-over', e => {
  const d = e.detail || {};
  ovScore.textContent = String(d.score || 0);
  ovWave.textContent = String(d.wave || 1);
  ovKill.textContent = String(d.kills || 0);
  over.classList.add('on');
  aim.classList.remove('lock');
  sfx.blip(false);
});

// sesi VR mengambil alih tampilannya sendiri: HUD kaca di headset dibangun di
// solar.js, jadi lapisan DOM ini minggir supaya tidak muncul di pantulan layar
document.addEventListener('ar-start', () => { if (on) { const s = scene(); if (s) s.setMeteorMode(false); } });

/* ---------- bidikan ---------- */

let ax = innerWidth / 2, ay = innerHeight / 2, cx = ax, cy = ay, raf = 0;
const track = e => { ax = e.clientX; ay = e.clientY; };
addEventListener('pointermove', track, { passive: true });
addEventListener('pointerdown', track, { passive: true, capture: true });
addEventListener('pointerup', track, { passive: true, capture: true });

const follow = () => {
  raf = requestAnimationFrame(follow);
  if (!on) return;
  // sedikit tertinggal dari kursor, seperti turret yang punya massa
  cx += (ax - cx) * 0.42;
  cy += (ay - cy) * 0.42;
  aim.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)';
};
raf = requestAnimationFrame(follow);

addEventListener('resize', () => { if (on) { setTip(); aim.classList.toggle('fine', fine()); aim.style.display = fine() ? 'block' : 'none'; } });

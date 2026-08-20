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
html.mt-on [data-ui="vignette"] { background: radial-gradient(66% 58% at 50% 50%, transparent 34%, rgba(24,8,4,.78) 100%) !important; }
html.mt-on, html.mt-on body, html.mt-on * { cursor: none !important; }

.mt-root {
  --paper: #f3f2f8; --muted: #8f8aa3; --hot: #ff8a3d; --burn: #ff5a3d; --iris: #9E94F9;
  --mono: 'IBM Plex Mono', ui-monospace, SFMono-Regular, monospace;
  position: fixed; inset: 0; z-index: 44; pointer-events: none; color: var(--paper);
  font-family: 'Instrument Sans', system-ui, sans-serif; display: none;
}
.mt-root.on { display: block; }

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
  el('div', {}, [el('span', { class: 'lab', text: 'SKOR' }), scoreNum]),
  el('div', {}, [el('span', { class: 'lab', text: 'GELOMBANG' }), waveNum]),
  el('div', {}, [el('span', { class: 'lab', text: 'TERTEMBAK' }), killNum])
]);

const hud = el('div', { class: 'mt-hud' }, [
  el('div', { class: 'mt-hp' }, [el('span', { class: 'lab', text: 'INTEGRITAS SISTEM' }), barWrap]),
  hpNum,
  el('span', { class: 'mt-sep' }),
  statsRow,
  muteBtn
]);

const waveV = el('div', { class: 'v', text: 'GELOMBANG 01' });
const waveBanner = el('div', { class: 'mt-wave' }, [el('div', { class: 'k', text: 'ANCAMAN MENINGKAT' }), waveV]);
const flash = el('div', { class: 'mt-flash' });
const tip = el('div', { class: 'mt-tip' });

const ovScore = el('b', { text: '0' });
const ovWave = el('b', { text: '1' });
const ovKill = el('b', { text: '0' });
const over = el('div', { class: 'mt-over' }, [
  el('h2', { text: 'SISTEM RUNTUH' }),
  el('p', { text: 'Meteor menembus pertahanan. Tata surya Spatial butuh penembak baru.' }),
  el('div', { class: 'mt-stats' }, [
    el('div', {}, [el('span', { text: 'SKOR' }), ovScore]),
    el('div', {}, [el('span', { text: 'GELOMBANG' }), ovWave]),
    el('div', {}, [el('span', { text: 'TERTEMBAK' }), ovKill])
  ]),
  el('div', { class: 'mt-acts' }, [
    el('button', { class: 'mt-again', text: 'MAIN LAGI', onclick: () => { const s = scene(); if (s) s.restartMeteor(); } }),
    el('button', { class: 'mt-quit', text: 'KELUAR MODE', onclick: () => { const s = scene(); if (s) s.setMeteorMode(false); } })
  ])
]);

const tap = el('div', { class: 'mt-tap' });
const root = el('div', { class: 'mt-root' }, [hud, waveBanner, flash, tip, over]);
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
  let ctx = null, muted = false;
  const ac = () => {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  };
  const noise = (c, dur) => {
    const n = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, n, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = c.createBufferSource();
    src.buffer = buf;
    return src;
  };
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
  muteBtn.textContent = m ? '✕' : '♪';
  muteBtn.style.borderColor = m ? 'rgba(243,242,248,.16)' : 'rgba(255,138,61,.5)';
  muteBtn.style.color = m ? '' : '#ff8a3d';
});

/* ---------- keadaan ---------- */

let on = false;

const setTip = () => {
  tip.textContent = fine()
    ? 'TAHAN KLIK — TEMBAK · GESER KE TEPI ATAU A/D — PUTAR · ESC — KELUAR'
    : 'KETUK UNTUK MENEMBAK · GESER UNTUK MELIHAT SEKELILING';
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

const start = () => {
  on = true;
  document.documentElement.classList.add('mt-on');
  root.classList.add('on');
  aim.classList.toggle('fine', fine());
  aim.style.display = fine() ? 'block' : 'none';
  over.classList.remove('on');
  setTip();
  waveV.textContent = 'GELOMBANG 01';
};

const stop = () => {
  on = false;
  document.documentElement.classList.remove('mt-on');
  root.classList.remove('on');
  aim.style.display = 'none';
  over.classList.remove('on');
};

/* ---------- kabel ke scene ---------- */

document.addEventListener('meteor-start', start);
document.addEventListener('meteor-end', stop);
document.addEventListener('meteor-restart', () => {
  over.classList.remove('on');
  sfx.blip(true);
});
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
  waveV.textContent = 'GELOMBANG ' + String(w).padStart(2, '0');
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

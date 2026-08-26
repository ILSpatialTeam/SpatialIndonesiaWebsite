// Suara orbit.
//
// Bukan bagian dari antarmuka dan bukan bagian dari scene: ia pendengar yang
// membaca `systemMap()` lalu menerjemahkannya jadi nada. Kalau dihapus, tidak
// ada satu pun modul lain yang perlu berubah.
import { scene } from '../core/dom.js';
import { signal } from '../ui/organisms/signals.js';
import { audioContext } from '../core/audio.js';

let btnRef = null;
export function mountButton(btn) { btnRef = btn; }

// Tiap planet punya satu nada dalam tangga pentatonik, jadi kombinasi apa pun
// tetap enak didengar. Kerasnya mengikuti kedekatan, kiri-kanannya mengikuti
// posisi di layar — tata suryanya jadi bisa dinavigasi sambil memejamkan mata.
export const ambience = (() => {
  const NOTE = { inti: 58.27, gabung: 196, program: 293.66, karya: 329.63, event: 392, insight: 440, tim: 523.25 };
  let ctx = null, master = null, voices = null, on = false, timer = 0;

  const build = () => {
    ctx = audioContext();
    if (!ctx) return false;
    master = ctx.createGain();
    master.gain.value = 0.0001;
    master.connect(ctx.destination);
    voices = {};
    Object.keys(NOTE).forEach(id => {
      const o = ctx.createOscillator(), g = ctx.createGain(), pan = ctx.createStereoPanner
        ? ctx.createStereoPanner() : null;
      o.type = id === 'inti' ? 'sawtooth' : 'sine';
      o.frequency.value = NOTE[id];
      g.gain.value = 0.0001;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = id === 'inti' ? 180 : 1400;
      o.connect(lp); lp.connect(g);
      if (pan) { g.connect(pan); pan.connect(master); } else g.connect(master);
      o.start();
      voices[id] = { g, pan };
    });
    return true;
  };

  const step = () => {
    const s = scene();
    if (!on || !s || !s.systemMap) return;
    const m = s.systemMap();
    const now = ctx.currentTime;
    m.bodies.forEach(b => {
      const v = voices[b.id];
      if (!v) return;
      v.g.gain.setTargetAtTime(Math.pow(b.near, 2.2) * 0.055, now, 0.25);
      if (v.pan) v.pan.pan.setTargetAtTime(b.sx * 0.8, now, 0.25);
    });
    const sun = voices.inti;
    if (sun) {
      sun.g.gain.setTargetAtTime(0.02 + m.sun.near * 0.05, now, 0.3);
      if (sun.pan) sun.pan.pan.setTargetAtTime(m.sun.sx * 0.5, now, 0.3);
    }
  };

  return {
    toggle() {
      if (!ctx && !build()) { signal('This browser does not support Web Audio.', 'warn'); return false; }
      on = !on;
      if (ctx.state === 'suspended') ctx.resume();
      master.gain.setTargetAtTime(on ? 0.9 : 0.0001, ctx.currentTime, on ? 0.6 : 0.4);
      if (btnRef) btnRef.classList.toggle('on', on);
      clearInterval(timer);
      if (on) { step(); timer = setInterval(step, 90); signal('Orbit sound on. Each planet has its own note — get closer to hear it.'); }
      try { localStorage.setItem('si.audio', on ? 'on' : 'off'); } catch (e) { /* boleh gagal */ }
      return on;
    },
    isOn() { return on; }
  };
})();

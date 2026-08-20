// Orbit sebagai kalender.
//
// Planet Event tidak mengorbit dengan kecepatan karangan: sudutnya ke Titik
// Temu adalah sisa waktu menuju pertemuan berikutnya, dan busur di antara
// keduanya adalah perjalanan yang belum ditempuh. Sistem ini hanya menghitung
// dan menggambar; dari mana agendanya datang bukan urusannya.
import * as THREE from '../core/three.js';
import { clamp } from '../core/math.js';
import { PAPER, MINT } from '../data/planets.js';
import { agendaState } from '../data/agenda.js';

export const MEET_ANGLE = 0;

export function createAgendaOrbit(ctx) {
  let A = null;

  // Planet Event tidak mengorbit dengan kecepatan karangan. Jarak sudutnya ke
  // Titik Temu adalah sisa waktu menuju pertemuan berikutnya, dan busur di
  // antara keduanya adalah perjalanan yang belum ditempuh. Saat harinya tiba,
  // planet dan titik temu berimpit.
  function build() {
    const P = ctx.bodies.planets.find(p => p.id === 'event');
    if (!P) return;
    const group = new THREE.Group();
    group.name = 'agenda';
    ctx.world.add(group);

    const at = new THREE.Vector3(Math.cos(MEET_ANGLE) * P.orbit, 0, Math.sin(MEET_ANGLE) * P.orbit);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: ctx.glowTexture(128, [
        [0, 'rgba(255,255,255,.95)'],
        [0.22, 'rgba(216,208,255,.7)'],
        [0.55, 'rgba(158,148,249,.28)'],
        [1, 'rgba(106,90,224,0)']
      ]),
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.85
    }));
    glow.position.copy(at);
    glow.scale.set(4.2, 4.2, 1);

    const ring = [];
    for (let i = 0; i <= 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      ring.push(new THREE.Vector3(at.x + Math.cos(a) * 1.5, 0, at.z + Math.sin(a) * 1.5));
    }
    const gate = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(ring),
      new THREE.LineBasicMaterial({ color: PAPER, transparent: true, opacity: 0.5, depthWrite: false })
    );

    const tag = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false, opacity: 0.9 }));
    tag.position.set(at.x, 3.1, at.z);
    tag.scale.set(15, 3.75, 1);

    const arc = new THREE.Line(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: MINT, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false })
    );

    group.add(glow, gate, tag, arc);
    A = { group, glow, gate, tag, arc, orbit: P.orbit, angle: 0, state: null, at: 0 };
    refresh();
  }

  function meetTexture(st) {
    const c = ctx.makeCanvas(560, 140);
    const g = c.getContext('2d');
    g.textAlign = 'center';
    g.fillStyle = 'rgba(216,208,255,.95)';
    g.font = "500 34px 'Poppins', system-ui, sans-serif";
    g.fillText('TITIK TEMU', 280, 44);
    g.fillStyle = 'rgba(169,155,242,.9)';
    g.font = "400 26px 'IBM Plex Mono', ui-monospace, monospace";
    g.fillText(st.days === 0 ? 'HARI INI' : st.days + ' HARI LAGI', 280, 92);
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 4;
    return t;
  }

  function refresh() {
    if (!A) return;
    const st = agendaState();
    A.state = st;
    A.at = Date.now();
    A.angle = MEET_ANGLE + (1 - st.progress) * Math.PI * 2;

    const pts = [];
    for (let i = 0; i <= 96; i++) {
      const a = MEET_ANGLE + (1 - st.progress) * Math.PI * 2 * (1 - i / 96);
      pts.push(new THREE.Vector3(Math.cos(a) * A.orbit, 0, Math.sin(a) * A.orbit));
    }
    A.arc.geometry.dispose();
    A.arc.geometry = new THREE.BufferGeometry().setFromPoints(pts);
    if (A.tag.material.map) A.tag.material.map.dispose();
    A.tag.material.map = meetTexture(st);
    A.tag.material.needsUpdate = true;

    ctx.bus.emit('agenda', { days: st.days, next: st.next, prev: st.prev, progress: st.progress, list: st.list });
  }

  function state() { return A ? A.state : null; }

  let lastT = 0;

  function update(t) {
    if (!A) return;
    if (t - lastT > 30) { lastT = t; refresh(); }   // agenda berubah dalam hitungan hari
    // makin dekat harinya, makin terang titik temunya
    const near = A.state ? A.state.progress : 0;
    const pulse = 0.6 + Math.sin(t * (1.4 + near * 2.6)) * 0.22 + near * 0.4;
    A.glow.material.opacity = clamp(pulse, 0, 1);
    A.glow.scale.setScalar(4.2 + Math.sin(t * 1.6) * 0.5 + near * 1.4);
    A.arc.material.opacity = 0.22 + near * 0.4;
  }

  return {
    name: 'agenda',
    build,
    update,
    refresh,
    state,
    // sudut planet Event dibaca oleh sistem benda langit tiap frame
    get angle() { return A ? A.angle : 0; },
    get visual() { return A; }
  };
}

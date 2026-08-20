// Jejak penjelajah sebelumnya.
//
// Bukan obrolan, bukan angka pengunjung — cuma bekas jalan yang perlahan pudar.
// Datanya sekarang contoh; bentuknya sengaja sesederhana mungkin supaya
// menggantinya dengan data server tidak menyentuh kode ini sama sekali.
import * as THREE from '../core/three.js';
import { clamp, lerp } from '../core/math.js';
import { PRESENCE } from '../data/agenda.js';

export function createTrails(ctx) {
  let T = null;

  // Lintasan orang-orang yang lewat sebelum kamu. Bukan obrolan, bukan angka
  // pengunjung — cuma bekas jalan yang perlahan pudar.
  function build() {
    const group = new THREE.Group();
    group.name = 'trails';
    group.visible = false;
    ctx.world.add(group);

    const items = PRESENCE.map((v, i) => {
      const pts = [];
      v.path.forEach((id, j) => {
        const f = ctx.bodies.focusOf(id);
        if (f) pts.push(new THREE.Vector3(f.pos.x, f.pos.y + 2.4 + j * 1.6, f.pos.z));
      });
      if (pts.length < 2) return null;
      // tiap penjelajah datang dari luar sistem, bukan muncul begitu saja
      const head = pts[0].clone();
      head.setLength(Math.max(head.length() * 2.1, 52));
      head.y += 7;
      pts.unshift(head);
      const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.4);
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(curve.getPoints(72)),
        new THREE.LineBasicMaterial({
          color: i === 0 ? 0xd8d0ff : 0x8f83f4, transparent: true, opacity: 0,
          blending: THREE.AdditiveBlending, depthWrite: false, fog: false
        })
      );
      group.add(line);
      return { line, ago: v.ago, k: clamp(1 - v.ago / 190, 0.14, 1) };
    }).filter(Boolean);

    T = { group, items, on: false, fade: 0 };
  }

  function toggle(on) {
    if (!T) return false;
    T.on = on === undefined ? !T.on : !!on;
    if (T.on) T.group.visible = true;
    ctx.bus.emit('trails', { on: T.on, count: PRESENCE.length });
    return T.on;
  }

  function count() { return PRESENCE.length; }

  function update(t) {
    if (!T) return;
    T.fade = lerp(T.fade, T.on ? 1 : 0, 0.09);
    if (T.fade < 0.004) { T.group.visible = false; return; }
    T.group.visible = true;
    T.items.forEach((it, i) => {
      it.line.material.opacity = T.fade * it.k * (0.34 + Math.sin(t * 0.5 + i * 1.3) * 0.14);
    });
  }

  return { name: 'trails', build, update, toggle, count, get state() { return T; } };
}

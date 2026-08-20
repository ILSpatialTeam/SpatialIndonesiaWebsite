// Aurora — tirai cahaya yang muncul di tempat acak.
//
// Satu bidang yang dilengkungkan di vertex shader, bukan partikel: jauh lebih
// murah, dan justru itu yang membuat gerakannya halus seperti kain.
import * as THREE from '../core/three.js';
import { lerp } from '../core/math.js';

export function createAurora(ctx) {
  let A = null;

  // Tirai cahaya yang muncul di tempat acak tiap kali dinyalakan. Bentuknya
  // satu bidang yang dilengkungkan di vertex shader — jauh lebih murah daripada
  // partikel, dan justru itu yang membuat gerakannya halus seperti kain.
  function build() {
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, fog: false,
      uniforms: {
        uT: { value: 0 }, uFade: { value: 0 },
        uA: { value: new THREE.Color(0x5fe6d0) },
        uB: { value: new THREE.Color(0x9E94F9) },
        uC: { value: new THREE.Color(0xb9b0ff) }
      },
      vertexShader: [
        'uniform float uT;',
        'varying vec2 vUv;',
        'void main() {',
        '  vUv = uv;',
        '  vec3 p = position;',
        // gelombang tirai: dua frekuensi supaya lipatannya tidak berulang rapi
        '  float w = sin(uv.x * 9.4 + uT * 0.35) * 0.17 + sin(uv.x * 19.5 - uT * 0.22) * 0.07;',
        '  p.z += w;',
        // puncaknya terseret lebih jauh — tirai terasa berlapis, bukan pipih
        '  p.z += uv.y * sin(uv.x * 13.0 + uT * 0.5) * 0.06;',
        '  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);',
        '}'
      ].join('\n'),
      fragmentShader: [
        'precision highp float;',
        'uniform float uT, uFade;',
        'uniform vec3 uA, uB, uC;',
        'varying vec2 vUv;',
        'void main() {',
        '  float x = vUv.x, y = vUv.y;',
        '  float s1 = 0.5 + 0.5 * sin(x * 38.0 + uT * 0.9 + sin(x * 7.0 - uT * 0.4) * 2.2);',
        '  float s2 = 0.5 + 0.5 * sin(x * 97.0 - uT * 1.5);',
        '  float streak = mix(s1, s1 * s2, 0.55);',
        // kaki terang, puncak larut ke langit
        '  float fade = smoothstep(0.0, 0.16, y) * pow(1.0 - y, 1.5);',
        // tepinya meruncing supaya tidak terlihat sebagai potongan kotak
        '  float edge = smoothstep(0.0, 0.14, x) * smoothstep(1.0, 0.86, x);',
        '  float a = fade * edge * (0.22 + 0.78 * streak) * uFade;',
        '  vec3 col = mix(uA, uB, clamp(y * 1.4, 0.0, 1.0));',
        '  col = mix(col, uC, pow(y, 3.0) * 0.5 * streak);',
        '  gl_FragColor = vec4(col, a);',
        '}'
      ].join('\n')
    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 140, 18), mat);
    mesh.name = 'aurora';
    mesh.frustumCulled = false;
    mesh.visible = false;
    ctx.world.add(mesh);
    A = { mesh, mat, on: false, fade: 0, near: null };
  }

  function place() {
    const ang = Math.random() * Math.PI * 2;
    const rad = 21 + Math.random() * 20;
    A.mesh.position.set(Math.cos(ang) * rad, -3 + Math.random() * 5, Math.sin(ang) * rad);
    // menghadap ke luar sistem, dengan sedikit miring supaya tidak kaku
    A.mesh.rotation.set(0, -ang + (Math.random() - 0.5) * 0.9, (Math.random() - 0.5) * 0.22);
    A.mesh.scale.set(32 + Math.random() * 22, 18 + Math.random() * 10, 16 + Math.random() * 14);

    const warm = Math.random() < 0.4;
    A.mat.uniforms.uA.value.setHex(warm ? 0x7ce8b8 : 0x5fe6d0);
    A.mat.uniforms.uC.value.setHex(warm ? 0xffa8d8 : 0xb9b0ff);

    let best = null, bd = 1e9;
    ctx.bodies.planets.forEach(p => {
      const d = p.group.position.distanceTo(A.mesh.position);
      if (d < bd) { bd = d; best = p; }
    });
    A.near = best ? best.label : null;
  }

  function toggle(on) {
    if (!A) return false;
    A.on = on === undefined ? !A.on : !!on;
    if (A.on) {
      place();          // tempat baru tiap kali dinyalakan
      A.mesh.visible = true;
    }
    ctx.bus.emit('aurora', { on: A.on, near: A.near });
    return A.on;
  }

  function update(t) {
    if (!A) return;
    A.fade = lerp(A.fade, A.on ? 1 : 0, 0.055);
    if (A.fade < 0.004) { A.mesh.visible = false; return; }
    A.mesh.visible = true;
    A.mat.uniforms.uT.value = t;
    A.mat.uniforms.uFade.value = A.fade * 1.3;
    A.mesh.rotation.y += Math.sin(t * 0.13) * 0.0008;
  }

  return { name: 'aurora', build, update, toggle, get state() { return A; } };
}

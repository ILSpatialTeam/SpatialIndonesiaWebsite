// Mode meteor — permainan pertahanan tata surya.
//
// Seluruh isi permainan ada di sini: batu, laser, ledakan, gelombang, dan
// urutan naik kokpit. Ia tidak menyentuh DOM sama sekali; papan skor di layar
// dan di dalam headset hanya mendengar kejadian yang dipancarkannya.
//
// Yang dibutuhkannya dari luar cuma dua: benda langit (untuk tahu ke mana batu
// jatuh) dan sebuah port kendali pandangan — bukan seluruh isi scene.
import * as THREE from '../core/three.js';
import { clamp } from '../core/math.js';

// batu: jumlah jejak, radius kemunculan, ketahanan awal, jeda antar tembakan
export const MET_TRAIL = 24, MET_SPAWN_R = 86, MET_HEALTH = 100, MET_COOL = 0.11;
// naik ke kokpit: lama penyalaan, versi pendeknya, jarak datang, jarak pos tempur
export const MET_ARM = 2.4, MET_REARM = 1.1, MET_FAR = 112, MET_STATION = 64;

export function createMeteorGame(ctx) {
  let M = null, glow = null, hud = null, hudCanvas = null, hudTex = null, hudStamp = null;
  const tmp = new THREE.Vector3();
  const gO = new THREE.Vector3();
  const gD = new THREE.Vector3();

  // Every rock owns its trail material: the fade is per-meteor, so the uniform
  // can't be shared the way the comet's single tail can.
  function trailMat() {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        tGlow: { value: glow },
        uSize: { value: 1 },
        uFade: { value: 0 }
      },
      vertexShader: [
        'attribute float aLife;',
        'uniform float uSize;',
        'varying float vLife;',
        'void main() {',
        '  vLife = aLife;',
        '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
        '  gl_PointSize = uSize * (0.14 + aLife * 1.86) * (280.0 / max(-mv.z, 0.001));',
        '  gl_Position = projectionMatrix * mv;',
        '}'
      ].join('\n'),
      fragmentShader: [
        'precision highp float;',
        'uniform sampler2D tGlow;',
        'uniform float uFade;',
        'varying float vLife;',
        'void main() {',
        '  float a = texture2D(tGlow, gl_PointCoord).a * vLife * uFade;',
        // the wake cools from white-hot at the rock down to smouldering ember
        '  vec3 col = mix(vec3(0.62, 0.13, 0.05), vec3(1.0, 0.95, 0.82), vLife * vLife);',
        '  gl_FragColor = vec4(col, 1.0) * a;',
        '}'
      ].join('\n')
    });
  }

  function build() {
    const group = new THREE.Group();
    group.name = 'meteors';
    group.visible = false;
    ctx.world.add(group);

    glow = ctx.glowTexture(64, [
      [0, 'rgba(255,255,255,1)'],
      [0.2, 'rgba(255,228,176,.95)'],
      [0.46, 'rgba(255,138,61,.5)'],
      [1, 'rgba(255,64,32,0)']
    ]);

    // beams live in scene space: one end is a controller or the camera, the
    // other a rock inside the (differently scaled) solar system group
    const beams = new THREE.Group();
    beams.name = 'meteorBeams';
    ctx.scene.add(beams);

    M = {
      group, beams,
      pool: [], hits: [], beamPool: [], bursts: [],
      on: false, over: false, firing: false, cool: 0, lock: null, shake: 0, arm: null,
      health: MET_HEALTH, score: 0, kills: 0, wave: 1,
      gap: 2.6, maxAlive: 3, speed: 4.6, spawnT: 1.4
    };

    // in-headset readout: the DOM HUD can't follow you into VR
    hud = new THREE.Mesh(
      new THREE.PlaneGeometry(0.44, 0.11),
      new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide, depthTest: false })
    );
    hud.name = 'meteorHud';
    hud.renderOrder = 998;
    hud.visible = false;
    hudCanvas = ctx.makeCanvas(768, 192);
    hudTex = new THREE.CanvasTexture(hudCanvas);
    hudTex.colorSpace = THREE.SRGBColorSpace;
    hud.material.map = hudTex;
    ctx.scene.add(hud);
  }

  function makeMeteor() {
    const m = {
      id: M.pool.length, alive: false, r: 0.4, speed: 5,
      at: new THREE.Vector3(), vel: new THREE.Vector3(), spin: new THREE.Vector3(),
      target: null, n: 0
    };
    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1, 0),
      new THREE.MeshStandardMaterial({ color: 0x1a1520, emissive: 0xff5a20, emissiveIntensity: 1.7, roughness: 0.95, flatShading: true })
    );
    core.name = 'meteorCore' + m.id;
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glow, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false
    }));
    // generous hitbox — this is a game, not a marksmanship exam
    const hit = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 8), new THREE.MeshBasicMaterial({ visible: false }));
    hit.userData.mid = m.id;

    const pos = new Float32Array(MET_TRAIL * 3);
    const life = new Float32Array(MET_TRAIL);
    for (let i = 0; i < MET_TRAIL; i++) life[i] = 1 - i / MET_TRAIL;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aLife', new THREE.BufferAttribute(life, 1));
    geo.setDrawRange(0, 0);
    const mat = trailMat();
    const trail = new THREE.Points(geo, mat);
    trail.frustumCulled = false;

    [core, halo, hit, trail].forEach(o => { o.visible = false; M.group.add(o); });
    Object.assign(m, { core, halo, hit, trail, mat, pos });
    M.pool.push(m);
    M.hits.push(hit);
    return m;
  }

  function spawn() {
    const m = M.pool.find(x => !x.alive) || makeMeteor();

    // planets take most of the fire; the core is the rarer, costlier target
    const pick = Math.random();
    m.target = pick < 0.24 ? 'inti' : PLANETS[Math.floor(Math.random() * PLANETS.length)].id;
    const to = ctx.bodies.focusOf(m.target);

    // come in from anywhere on the sky, but stay near the orbital plane so the
    // rock crosses the frame instead of dropping in from straight overhead
    const th = Math.random() * Math.PI * 2;
    const y = (Math.random() - 0.5) * 0.5;
    m.at.set(Math.cos(th) * MET_SPAWN_R, y * MET_SPAWN_R, Math.sin(th) * MET_SPAWN_R);
    m.r = 0.3 + Math.random() * 0.42;
    m.speed = M.speed * (0.82 + Math.random() * 0.4);
    m.vel.copy(to.pos).sub(m.at).normalize().multiplyScalar(m.speed);
    m.spin.set(Math.random() * 2.4 - 1.2, Math.random() * 2.4 - 1.2, Math.random() * 2.4 - 1.2);
    m.alive = true;
    m.n = 0;

    m.core.scale.setScalar(m.r);
    m.core.position.copy(m.at);
    m.hit.scale.setScalar(Math.max(m.r * 3.1, 0.9));
    m.hit.position.copy(m.at);
    m.halo.position.copy(m.at);
    m.trail.geometry.setDrawRange(0, 0);
    [m.core, m.halo, m.hit, m.trail].forEach(o => { o.visible = true; });
    ctx.bus.emit('meteor-spawn', { target: m.target });
  }

  function stepMeteor(m, dt, t, ws) {
    const to = ctx.bodies.focusOf(m.target);
    if (to) {
      tmp.copy(to.pos).sub(m.at);
      const d = tmp.length();
      if (d < to.size + m.r * 1.9) return impact(m, to);
      // mild homing: the target keeps orbiting, so the rock keeps correcting
      tmp.normalize().multiplyScalar(m.speed);
      m.vel.lerp(tmp, Math.min(1, dt * 0.85));
    }
    m.at.addScaledVector(m.vel, dt);
    if (m.at.length() > MET_SPAWN_R * 1.9) return retire(m);

    const p = m.pos;
    if (m.n > 1) p.copyWithin(3, 0, (m.n - 1) * 3);
    p[0] = m.at.x; p[1] = m.at.y; p[2] = m.at.z;
    m.n = Math.min(MET_TRAIL, m.n + 1);
    m.trail.geometry.setDrawRange(0, m.n);
    m.trail.geometry.attributes.position.needsUpdate = true;
    m.mat.uniforms.uSize.value = m.r * 5.6 * ws;
    m.mat.uniforms.uFade.value = 1;

    m.core.position.copy(m.at);
    m.core.rotation.x += m.spin.x * dt;
    m.core.rotation.y += m.spin.y * dt;
    m.core.rotation.z += m.spin.z * dt;
    m.hit.position.copy(m.at);
    m.halo.position.copy(m.at);
    // the burn flickers rather than glows flat
    const flick = 1 + Math.sin(t * 21 + m.id * 1.7) * 0.09 + Math.sin(t * 47 + m.id) * 0.04;
    m.halo.scale.setScalar(m.r * 7.4 * flick);
    m.halo.material.opacity = 0.9;
    m.core.material.emissiveIntensity = 1.5 + Math.sin(t * 18 + m.id) * 0.35;
  }

  function retire(m) {
    m.alive = false;
    m.n = 0;
    m.trail.geometry.setDrawRange(0, 0);
    [m.core, m.halo, m.hit, m.trail].forEach(o => { o.visible = false; });
  }

  function impact(m, to) {
    const dmg = m.target === 'inti' ? 18 : Math.round(7 + m.r * 16);
    M.health = Math.max(0, M.health - dmg);
    M.shake = Math.min(1.4, M.shake + 0.75);
    burst(m.at, 0xff6a2c, 34, 6.5, m.r * 3.6);
    const p = ctx.bodies.planets.find(x => x.id === m.target);
    if (p) p.mesh.userData.punch = 1;
    retire(m);
    ctx.bus.emit('meteor-hit', { id: m.target, damage: dmg, health: M.health });
    pushHud();
    if (M.health <= 0) gameOver();
  }

  /* -- laser -- */

  function beam(from, to) {
    let b = M.beamPool.find(x => x.life <= 0);
    if (!b) {
      const geo = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true);
      geo.rotateX(Math.PI / 2);          // +Y becomes +Z
      geo.translate(0, 0, 0.5);          // and the tube now spans z = 0..1
      const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
        color: 0xbfe4ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false
      }));
      mesh.frustumCulled = false;
      mesh.visible = false;
      M.beams.add(mesh);
      b = { mesh, life: 0, dur: 0.14 };
      M.beamPool.push(b);
    }
    const xr = ctx.renderer.xr.isPresenting;
    const rad = xr ? 0.0028 : 0.022;
    b.mesh.position.copy(from);
    b.mesh.lookAt(to);
    b.mesh.scale.set(rad, rad, from.distanceTo(to));
    b.mesh.visible = true;
    b.life = b.dur;
  }

  function muzzles() {
    const c = ctx.camera;
    // twin cannons slung below the viewport, so the bolts converge on the sight
    return [
      new THREE.Vector3(-1.15, -0.66, -1.7).applyMatrix4(c.matrixWorld),
      new THREE.Vector3(1.15, -0.66, -1.7).applyMatrix4(c.matrixWorld)
    ];
  }

  // screen aim: the crosshair is the barrel
  function fireAt(ndc) {
    if (!M.on || M.over || M.arm || M.cool > 0) return;
    ctx.ray.setFromCamera(ndc || ctx.pointer.ndc, ctx.camera);
    fireRay(ctx.ray.ray.origin.clone(), ctx.ray.ray.direction.clone(), muzzles());
  }

  function fireFrom(source) {
    if (!M.on || M.over || M.arm || M.cool > 0) return;
    const o = new THREE.Vector3().setFromMatrixPosition(source.matrixWorld);
    const d = new THREE.Vector3(0, 0, -1).transformDirection(source.matrixWorld).normalize();
    fireRay(o, d, [o.clone()]);
  }

  function fireRay(origin, dir, spouts) {
    M.cool = MET_COOL;
    ctx.ray.set(origin, dir);
    const live = M.hits.filter(h => h.visible);
    const h = live.length ? ctx.ray.intersectObjects(live, false)[0] : null;
    const end = h ? h.point.clone() : origin.clone().addScaledVector(dir, 400);
    spouts.forEach(mz => beam(mz, end));

    let killed = false;
    if (h) {
      const m = M.pool[h.object.userData.mid];
      if (m && m.alive) {
        killed = true;
        M.kills += 1;
        M.score += 10 + Math.round(m.r * 12);
        burst(m.at, 0xffd9a0, 38, 8, m.r * 3.8);
        retire(m);
        wave();
        pushHud();
      }
    }
    ctx.bus.emit('meteor-shot', { hit: killed });
  }

  /* -- serpihan -- */

  function burst(at, color, count, spread, size) {
    let b = M.bursts.find(x => x.t >= x.dur);
    if (!b) {
      const n = 40;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
      const mat = new THREE.PointsMaterial({
        map: glow, size: 1, transparent: true, opacity: 1,
        sizeAttenuation: true, blending: THREE.AdditiveBlending, depthWrite: false
      });
      const points = new THREE.Points(geo, mat);
      points.frustumCulled = false;
      points.visible = false;
      M.group.add(points);
      b = { points, mat, geo, vel: new Float32Array(n * 3), n, t: 1, dur: 1, size: 1 };
      M.bursts.push(b);
    }
    const n = Math.min(count, b.n);
    const p = b.geo.attributes.position.array;
    for (let i = 0; i < b.n; i++) {
      const j = i * 3;
      p[j] = at.x; p[j + 1] = at.y; p[j + 2] = at.z;
      if (i < n) {
        const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
        const s = spread * (0.25 + Math.random() * 0.75);
        b.vel[j] = Math.sin(ph) * Math.cos(th) * s;
        b.vel[j + 1] = Math.cos(ph) * s;
        b.vel[j + 2] = Math.sin(ph) * Math.sin(th) * s;
      } else {
        b.vel[j] = b.vel[j + 1] = b.vel[j + 2] = 0;
      }
    }
    b.geo.setDrawRange(0, n);
    b.geo.attributes.position.needsUpdate = true;
    b.mat.color.set(color);
    b.size = size;
    b.t = 0;
    b.dur = 0.72;
    b.points.visible = true;
  }

  /* -- jalannya permainan -- */

  function wave() {
    const w = 1 + Math.floor(M.score / 120);
    if (w === M.wave) return;
    M.wave = w;
    // more rocks, arriving sooner and faster, the better you shoot
    M.gap = Math.max(0.4, 2.6 - (w - 1) * 0.22);
    M.maxAlive = Math.min(16, 2 + w);
    M.speed = 4.6 + (w - 1) * 0.55;
    ctx.bus.emit('meteor-wave', { wave: w });
  }

  function pushHud() {
    hudStamp = null;
    ctx.bus.emit('meteor-hud', { health: M.health, score: M.score, wave: M.wave, kills: M.kills, over: M.over });
  }

  function gameOver() {
    if (M.over) return;
    M.over = true;
    M.firing = false;
    M.pool.forEach(m => { if (m.alive) retire(m); });
    ctx.bus.emit('meteor-over', { score: M.score, wave: M.wave, kills: M.kills });
    // angka terakhir ikut disegarkan, termasuk papan kaca di dalam headset
    pushHud();
  }

  function reset() {
    M.pool.forEach(m => retire(m));
    M.beamPool.forEach(b => { b.life = 0; b.mesh.visible = false; });
    M.bursts.forEach(b => { b.t = b.dur; b.points.visible = false; });
    M.health = MET_HEALTH;
    M.score = 0; M.kills = 0; M.wave = 1;
    M.gap = 2.6; M.maxAlive = 3; M.speed = 4.6; M.spawnT = 1.4;
    M.over = false; M.firing = false; M.cool = 0; M.shake = 0; M.lock = null; M.arm = null;
    ctx.bodies.planets.forEach(p => { p.mesh.userData.punch = 0; });
    ctx.bus.emit('meteor-aim', { locked: false });
  }

  function setMode(on) {
    if (!M || M.on === !!on) return M && M.on;
    if (on && ctx.view.mode === 'ar') return false;   // AR stays display-only
    M.on = !!on;
    if (M.on) {
      ctx.view.closeArticle();
      ctx.view.freeFlight();
      reset();
      M.group.visible = true;
      ctx.view.clearMoonPin();
      // kapal datang dari jauh lalu merapat: jarak dan bidang pandang yang
      // menganimasikannya, bukan potongan kamera
      ctx.view.dist = MET_FAR;
      ctx.view.pitch = clamp(ctx.view.pitch, 0.12, 0.42);
      M.arm = { t: 0, t0: performance.now(), dur: MET_ARM, from: MET_FAR, to: MET_STATION };
      ctx.view.setComet(false);
      ctx.bus.emit('meteor-start', { arming: MET_ARM });
      pushHud();
    } else {
      reset();
      M.group.visible = false;
      if (hud) hud.visible = false;
      ctx.view.setFov(ctx.view.baseFov);
      ctx.camera.updateProjectionMatrix();
      ctx.bus.emit('meteor-end');
    }
    if (ctx.renderer.xr.isPresenting) ctx.view.hidePanel();
    return M.on;
  }

  function restart() {
    if (!M || !M.on) return;
    reset();
    M.arm = { t: 0, t0: performance.now(), dur: MET_REARM, from: ctx.view.dist, to: MET_STATION };
    ctx.bus.emit('meteor-restart', { arming: MET_REARM });
    pushHud();
  }

  function update(t, dt) {
    if (!M || !M.on) return;              // sistem menjaga saklarnya sendiri
    const ws = ctx.world.scale.x;

    if (M.arm) {
      // jamnya jalan di layar maupun di headset; efek kameranya saja yang
      // hanya berlaku di luar XR, karena proyeksi XR bukan milik kita
      M.arm.t = clamp((performance.now() - M.arm.t0) / (M.arm.dur * 1000), 0, 1);
      if (M.arm.t >= 1) {
        // jaraknya dipatok di sini, bukan diserahkan ke animasi kamera: kalau
        // loop sempat berhenti (tab pindah), kapal harus tetap berakhir di pos
        ctx.view.dist = M.arm.to;
        M.arm = null;
        ctx.view.setFov(ctx.view.baseFov);
        ctx.camera.updateProjectionMatrix();
        ctx.bus.emit('meteor-armed');
      }
    }

    if (!M.over && !M.arm) {
      M.spawnT -= dt;
      let alive = 0;
      M.pool.forEach(m => { if (m.alive) alive++; });
      // tiap batu itu tiga gambar (inti, pijar, jejak) dan di headset semuanya
      // digambar dua kali; gelombang tinggi dibatasi supaya frame tetap stabil
      const cap = ctx.renderer.xr.isPresenting ? Math.min(M.maxAlive, 10) : M.maxAlive;
      if (M.spawnT <= 0 && alive < cap) {
        spawn();
        M.spawnT = M.gap * (0.72 + Math.random() * 0.56);
      }
    }

    M.pool.forEach(m => { if (m.alive) stepMeteor(m, dt, t, ws); });

    M.cool = Math.max(0, M.cool - dt);
    // hold to keep firing, on screen only — in VR the trigger drives each bolt
    if (M.firing && !M.over && !ctx.renderer.xr.isPresenting) fireAt(ctx.pointer.ndc);

    M.beamPool.forEach(b => {
      if (b.life <= 0) return;
      b.life = Math.max(0, b.life - dt);
      const f = b.life / b.dur;
      b.mesh.material.opacity = f * f * 0.95;
      if (b.life <= 0) b.mesh.visible = false;
    });

    M.bursts.forEach(b => {
      if (b.t >= b.dur) return;
      b.t += dt;
      const f = clamp(b.t / b.dur, 0, 1);
      const p = b.geo.attributes.position.array;
      for (let i = 0; i < b.n; i++) {
        const j = i * 3;
        p[j] += b.vel[j] * dt; p[j + 1] += b.vel[j + 1] * dt; p[j + 2] += b.vel[j + 2] * dt;
        b.vel[j] *= 0.94; b.vel[j + 1] *= 0.94; b.vel[j + 2] *= 0.94;
      }
      b.geo.attributes.position.needsUpdate = true;
      b.mat.opacity = (1 - f) * (1 - f);
      b.mat.size = b.size * (0.5 + f * 1.4) * ws;
      if (b.t >= b.dur) b.points.visible = false;
    });

    if (ctx.renderer.xr.isPresenting) hudFrame();
  }

  // canvas readout that rides in front of the viewer while playing in VR
  // digambar ulang di kanvas yang sama: satu tekstur untuk seumur sesi, bukan
  // CanvasTexture baru tiap kali skor berubah
  function hudPaint() {
    const c = hudCanvas;
    const g = c.getContext('2d');
    g.clearRect(0, 0, 768, 192);
    g.fillStyle = 'rgba(18,17,22,.82)';
    g.strokeStyle = 'rgba(255,138,61,.5)';
    g.lineWidth = 3;
    g.beginPath();
    if (g.roundRect) g.roundRect(4, 4, 760, 184, 26); else g.rect(4, 4, 760, 184);
    g.fill(); g.stroke();

    g.fillStyle = '#8f8aa3';
    g.font = '500 24px Instrument Sans, sans-serif';
    g.fillText('INTEGRITAS SISTEM', 40, 56);

    const w = 470, x = 40, y = 76, h = 22;
    g.fillStyle = 'rgba(243,242,248,.12)';
    g.fillRect(x, y, w, h);
    const f = clamp(M.health / MET_HEALTH, 0, 1);
    g.fillStyle = f > 0.5 ? '#9E94F9' : (f > 0.25 ? '#ffb066' : '#ff5a3d');
    g.fillRect(x, y, w * f, h);

    g.fillStyle = '#f3f2f8';
    g.font = '600 34px Poppins, sans-serif';
    g.fillText(String(M.health).padStart(3, '0') + '%', x, 148);
    g.fillStyle = '#ffb066';
    g.fillText('SKOR ' + String(M.score).padStart(4, '0'), x + 190, 148);
    g.fillStyle = '#a99bf2';
    g.fillText('GELOMBANG ' + String(M.wave).padStart(2, '0'), 540, 90);
    if (M.over) {
      g.fillStyle = '#ff5a3d';
      g.font = '600 30px Poppins, sans-serif';
      g.fillText('SISTEM RUNTUH', 540, 148);
    } else if (M.arm) {
      g.fillStyle = '#ffb066';
      g.font = '600 28px Poppins, sans-serif';
      g.fillText('MENYIAPKAN KOKPIT', 380, 148);
    }
    hudTex.needsUpdate = true;
  }

  function hudFrame() {
    if (!hud) return;
    const stamp = M.health + '|' + M.score + '|' + M.wave + '|' + (M.over ? 1 : 0) + '|' + (M.arm ? 1 : 0);
    if (hudStamp !== stamp) {
      hudStamp = stamp;
      hudPaint();
    }
    hud.visible = true;
    const cam = ctx.renderer.xr.getCamera ? ctx.renderer.xr.getCamera() : ctx.camera;
    cam.getWorldPosition(tmp);
    const a = ctx.view.xrHome.set ? ctx.view.xrHome.yaw : 0;
    hud.position.set(tmp.x + Math.sin(a) * 0.9, ctx.view.xrHome.y + 0.34, tmp.z - Math.cos(a) * 0.9);
    hud.rotation.set(0, a, 0);
  }

  return {
    name: 'meteor',
    build,
    update,
    setMode,
    restart,
    fireAt,
    fireFrom,
    hudFrame,
    get state() { return M; },
    get on() { return !!(M && M.on); }
  };
}

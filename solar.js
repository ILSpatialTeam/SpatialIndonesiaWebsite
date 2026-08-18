import * as THREE from 'https://unpkg.com/three@0.184.0/build/three.module.js';

const ACCENT = 0xff5c2b, MINT = 0x6fe3b8, PAPER = 0xede8dc, INK = 0x0f0d14;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;

const PLANETS = [
  { id: 'program', label: 'Program', orbit: 11, size: 0.9, color: MINT, speed: 0.085, phase: 0.4, kind: 'ringed' },
  { id: 'karya', label: 'Karya', orbit: 15.5, size: 1.15, color: ACCENT, speed: 0.062, phase: 2.1, kind: 'dodeca' },
  { id: 'event', label: 'Event', orbit: 20, size: 0.85, color: PAPER, speed: 0.048, phase: 4.0, kind: 'wire' },
  { id: 'insight', label: 'Insight', orbit: 25, size: 1.0, color: MINT, speed: 0.038, phase: 5.4, kind: 'torus' },
  { id: 'tim', label: 'Tim', orbit: 30, size: 0.8, color: PAPER, speed: 0.03, phase: 1.2, kind: 'cluster' },
  { id: 'gabung', label: 'Gabung', orbit: 35.5, size: 1.3, color: ACCENT, speed: 0.024, phase: 3.3, kind: 'glow' }
];

class SolarSystem extends HTMLElement {
  connectedCallback() {
    if (this._booted) return;
    this._booted = true;
    this.style.cssText = 'display:block;width:100%;height:100%';

    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;cursor:grab';
    this.appendChild(canvas);
    this.canvas = canvas;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.xr.enabled = true;
    this.renderer = renderer;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(INK, 0.012);
    this.scene = scene;

    const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 400);
    camera.position.set(0, 16, 52);
    this.camera = camera;

    const world = new THREE.Group();
    world.name = 'solarSystem';
    scene.add(world);
    this.world = world;

    // starfield
    const starPos = [];
    for (let i = 0; i < 2600; i++) {
      const r = 90 + Math.random() * 130;
      const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
      starPos.push(r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph), r * Math.sin(ph) * Math.sin(th));
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: PAPER, size: 0.55, transparent: true, opacity: 0.75, sizeAttenuation: true }));
    stars.name = 'stars';
    world.add(stars);

    // dust plane
    const dustPos = [];
    for (let i = 0; i < 900; i++) {
      const r = 8 + Math.random() * 34, th = Math.random() * Math.PI * 2;
      dustPos.push(Math.cos(th) * r, (Math.random() - 0.5) * 2.4, Math.sin(th) * r);
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.Float32BufferAttribute(dustPos, 3));
    world.add(new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: MINT, size: 0.16, transparent: true, opacity: 0.4 })));

    // sun — the community core
    const sun = new THREE.Group();
    sun.name = 'inti';
    const sunCore = new THREE.Mesh(
      new THREE.IcosahedronGeometry(3, 3),
      new THREE.MeshStandardMaterial({ color: 0x2a1a1c, emissive: ACCENT, emissiveIntensity: 1.5, roughness: 0.6, flatShading: true })
    );
    sunCore.name = 'intiCore';
    sun.add(sunCore);
    const sunWire = new THREE.LineSegments(
      new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(4.1, 1)),
      new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.3 })
    );
    sun.add(sunWire);
    this.sunWire = sunWire;
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(5.6, 32, 32),
      new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.05 })
    );
    sun.add(halo);
    sun.add(new THREE.PointLight(ACCENT, 900, 140));
    world.add(sun);
    this.sun = sun;
    this.sunCore = sunCore;

    scene.add(new THREE.AmbientLight(0xffffff, 0.42));
    const rim = new THREE.DirectionalLight(MINT, 1.1); rim.position.set(-30, 22, -18); scene.add(rim);

    // planets
    this.planets = PLANETS.map(p => {
      const g = new THREE.Group();
      g.name = p.id;
      let mesh;
      const mat = new THREE.MeshStandardMaterial({ color: p.color, roughness: 0.42, metalness: 0.32, flatShading: p.kind !== 'glow' });
      mat.name = p.id + 'Material';
      if (p.kind === 'ringed') {
        mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(p.size, 2), mat);
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(p.size * 1.9, 0.03, 6, 90),
          new THREE.MeshBasicMaterial({ color: p.color, transparent: true, opacity: 0.6 })
        );
        ring.rotation.set(Math.PI / 2.3, 0.3, 0);
        g.add(ring);
      } else if (p.kind === 'dodeca') {
        mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(p.size, 0), mat);
      } else if (p.kind === 'wire') {
        mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(p.size, 1), mat);
        g.add(new THREE.LineSegments(
          new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(p.size * 1.45, 1)),
          new THREE.LineBasicMaterial({ color: p.color, transparent: true, opacity: 0.35 })
        ));
      } else if (p.kind === 'torus') {
        mesh = new THREE.Mesh(new THREE.TorusGeometry(p.size, p.size * 0.36, 14, 60), mat);
        mesh.rotation.x = 0.9;
      } else if (p.kind === 'cluster') {
        mesh = new THREE.Mesh(new THREE.OctahedronGeometry(p.size, 0), mat);
        for (let i = 0; i < 4; i++) {
          const m = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), mat);
          const a = (i / 4) * Math.PI * 2;
          m.position.set(Math.cos(a) * p.size * 1.9, Math.sin(a * 2) * 0.5, Math.sin(a) * p.size * 1.9);
          g.add(m);
        }
      } else {
        mesh = new THREE.Mesh(new THREE.SphereGeometry(p.size, 32, 32),
          new THREE.MeshStandardMaterial({ color: p.color, emissive: p.color, emissiveIntensity: 0.45, roughness: 0.3 }));
        const glow = new THREE.Mesh(new THREE.SphereGeometry(p.size * 1.7, 24, 24),
          new THREE.MeshBasicMaterial({ color: p.color, transparent: true, opacity: 0.1 }));
        g.add(glow);
      }
      mesh.name = p.id + 'Body';
      g.add(mesh);

      const hit = new THREE.Mesh(new THREE.SphereGeometry(Math.max(2.4, p.size * 2.8), 12, 12),
        new THREE.MeshBasicMaterial({ visible: false }));
      hit.userData.planetId = p.id;
      g.add(hit);

      const orbitPts = [];
      for (let i = 0; i <= 160; i++) {
        const a = (i / 160) * Math.PI * 2;
        orbitPts.push(new THREE.Vector3(Math.cos(a) * p.orbit, 0, Math.sin(a) * p.orbit));
      }
      const path = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(orbitPts),
        new THREE.LineBasicMaterial({ color: PAPER, transparent: true, opacity: 0.09 })
      );
      path.name = p.id + 'Orbit';
      world.add(path);
      world.add(g);
      return { ...p, group: g, mesh, hit, path, world: new THREE.Vector3() };
    });

    this.hits = this.planets.map(p => p.hit);
    this.ray = new THREE.Raycaster();
    this.ndc = new THREE.Vector2();
    this.pointer = { x: 0, y: 0 };
    this.yaw = 0; this.pitch = 0.34; this.dist = 56; this.dockDist = 7.2;
    this.active = null; this.hover = null;
    this.lookAt = new THREE.Vector3();
    this.desired = new THREE.Vector3();
    this.tmp = new THREE.Vector3();
    this.prevPos = camera.position.clone();
    this.speed = 0;

    // input
    let down = false, moved = 0, lx = 0, ly = 0;
    canvas.addEventListener('pointerdown', e => {
      down = true; moved = 0; lx = e.clientX; ly = e.clientY;
      canvas.setPointerCapture(e.pointerId); canvas.style.cursor = 'grabbing';
    });
    canvas.addEventListener('pointermove', e => {
      const r = canvas.getBoundingClientRect();
      this.ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      this.pointer.x = this.ndc.x; this.pointer.y = this.ndc.y;
      if (down) {
        const dx = e.clientX - lx, dy = e.clientY - ly;
        moved += Math.abs(dx) + Math.abs(dy);
        this.yaw -= dx * 0.0042;
        this.pitch = clamp(this.pitch + dy * 0.003, -0.5, 1.15);
        lx = e.clientX; ly = e.clientY;
      }
    });
    const up = e => {
      canvas.style.cursor = this.hover ? 'pointer' : 'grab';
      if (down && moved < 6) this._pick();
      down = false;
    };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', () => { down = false; });
    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      if (this.active) this.dockDist = clamp(this.dockDist + e.deltaY * 0.006, 2.6, 12);
      else this.dist = clamp(this.dist + e.deltaY * 0.03, 16, 96);
    }, { passive: false });

    this._keys = e => {
      if (e.key === 'Escape') this.freeFlight();
      else if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') this.dist = clamp(this.dist - 3, 16, 96);
      else if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') this.dist = clamp(this.dist + 3, 16, 96);
      else if (e.key === '0') this.travelTo('inti');
      else if (/^[1-6]$/.test(e.key)) this.travelTo(PLANETS[+e.key - 1].id);
    };
    addEventListener('keydown', this._keys);

    this._resize = () => {
      const w = this.clientWidth || innerWidth, h = this.clientHeight || innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
    };
    this._resize();
    this._ro = new ResizeObserver(this._resize); this._ro.observe(this);

    this.clock = new THREE.Clock();
    renderer.setAnimationLoop(() => this._frame());

    if (navigator.xr) {
      navigator.xr.isSessionSupported('immersive-vr')
        .then(ok => this.dispatchEvent(new CustomEvent('xr-support', { detail: { ok }, bubbles: true })))
        .catch(() => {});
    }
    requestAnimationFrame(() => this.dispatchEvent(new CustomEvent('scene-ready', { bubbles: true })));
  }

  disconnectedCallback() {
    removeEventListener('keydown', this._keys);
    if (this.renderer) this.renderer.setAnimationLoop(null);
    if (this._ro) this._ro.disconnect();
  }

  _pick() {
    this.ray.setFromCamera(this.ndc, this.camera);
    const hit = this.ray.intersectObjects(this.hits, false)[0];
    if (hit) return this.travelTo(hit.object.userData.planetId);
    const sunHit = this.ray.intersectObject(this.sunCore, false)[0];
    if (sunHit) return this.travelTo('inti');
  }

  travelTo(id) {
    this.active = id === 'inti' ? 'inti' : (this.planets.find(p => p.id === id) ? id : null);
    if (!this.active) return;
    this.dockDist = id === 'inti' ? 6.2 : 7.2;
    this.dispatchEvent(new CustomEvent('planet-focus', { detail: { id: this.active }, bubbles: true }));
  }

  freeFlight() {
    if (!this.active) return;
    this.active = null;
    this.dispatchEvent(new CustomEvent('planet-free', { bubbles: true }));
  }

  async enterVR() {
    if (!navigator.xr) throw new Error('WebXR tidak tersedia');
    const session = await navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor'] });
    await this.renderer.xr.setSession(session);
    session.addEventListener('end', () => { this._exitXR(); this._resize(); });
    return session;
  }

  _exitXR() {
    this.world.scale.setScalar(1);
    this.world.position.set(0, 0, 0);
  }

  _hud(key, val) {
    const el = document.querySelector('[data-hud="' + key + '"]');
    if (el && el.textContent !== val) el.textContent = val;
  }

  _labels() {
    const w = this.clientWidth, h = this.clientHeight;
    const items = this.planets.concat([{ id: 'inti', group: this.sun, size: 3, world: this._sunWorld = this._sunWorld || new THREE.Vector3() }]);
    items.forEach(p => {
      const el = document.querySelector('[data-planet-label="' + p.id + '"]');
      if (!el) return;
      p.group.getWorldPosition(this.tmp);
      const d = this.tmp.distanceTo(this.camera.position);
      this.tmp.project(this.camera);
      const behind = this.tmp.z > 1;
      const x = (this.tmp.x * 0.5 + 0.5) * w, y = (-this.tmp.y * 0.5 + 0.5) * h;
      const on = !behind && x > -60 && x < w + 60 && y > -40 && y < h + 40;
      el.style.transform = 'translate(-50%, -50%) translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
      el.style.opacity = on ? String(clamp(1.2 - d / 110, 0.25, 1)) : '0';
      el.style.pointerEvents = on ? 'auto' : 'none';
      el.style.borderColor = this.active === p.id ? '#ff5c2b' : (this.hover === p.id ? '#6fe3b8' : 'rgba(237,232,220,.18)');
    });
  }

  _frame() {
    const t = this.clock.getElapsedTime();
    const xr = this.renderer.xr.isPresenting;

    this.planets.forEach(p => {
      const a = t * p.speed + p.phase;
      p.group.position.set(Math.cos(a) * p.orbit, Math.sin(a * 1.7) * p.orbit * 0.035, Math.sin(a) * p.orbit);
      p.mesh.rotation.y += 0.004;
      p.mesh.rotation.x += 0.0016;
    });
    this.sunCore.rotation.y = t * 0.05;
    this.sunWire.rotation.y = -t * 0.07;
    this.sunWire.rotation.x = Math.sin(t * 0.2) * 0.12;

    if (xr) {
      this.world.scale.setScalar(0.035);
      this.world.position.set(0, 1.45, -1.6);
      this.renderer.render(this.scene, this.camera);
      return;
    }

    // hover
    this.ray.setFromCamera(this.ndc, this.camera);
    const hit = this.ray.intersectObjects(this.hits, false)[0];
    const hoverId = hit ? hit.object.userData.planetId : null;
    if (hoverId !== this.hover) {
      this.hover = hoverId;
      this.canvas.style.cursor = hoverId ? 'pointer' : 'grab';
      this.dispatchEvent(new CustomEvent('planet-hover', { detail: { id: hoverId }, bubbles: true }));
    }
    this.planets.forEach(p => {
      const target = this.hover === p.id ? 1.18 : 1;
      const s = lerp(p.mesh.scale.x, target, 0.12);
      p.mesh.scale.setScalar(s);
      p.path.material.opacity = lerp(p.path.material.opacity, this.active === p.id || this.hover === p.id ? 0.4 : 0.09, 0.08);
    });

    // camera target
    let focus = null;
    if (this.active === 'inti') focus = { pos: this.sun.position, size: 3 };
    else if (this.active) {
      const p = this.planets.find(x => x.id === this.active);
      if (p) focus = { pos: p.group.position, size: p.size };
    }

    if (focus) {
      const radial = this.tmp.copy(focus.pos);
      if (radial.length() < 0.01) radial.set(0, 0, 1);
      radial.normalize();
      const off = focus.size * this.dockDist;
      const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
      const rx = radial.x * cy - radial.z * sy, rz = radial.x * sy + radial.z * cy;
      this.desired.set(focus.pos.x + rx * off, focus.pos.y + off * (0.35 + this.pitch * 0.5), focus.pos.z + rz * off);
      this.lookAt.lerp(focus.pos, 0.06);
    } else {
      const yaw = this.yaw + t * 0.014;
      const d = this.dist;
      this.desired.set(Math.sin(yaw) * d * Math.cos(this.pitch), d * Math.sin(this.pitch) + 4, Math.cos(yaw) * d * Math.cos(this.pitch));
      this.lookAt.lerp(this.tmp.set(this.pointer.x * 2, this.pointer.y * -1.4, 0), 0.05);
    }

    this.prevPos.copy(this.camera.position);
    this.camera.position.lerp(this.desired, focus ? 0.028 : 0.02);
    this.camera.lookAt(this.lookAt);
    this.speed = lerp(this.speed, this.camera.position.distanceTo(this.prevPos) * 620, 0.15);

    this._labels();
    const distToTarget = focus ? this.camera.position.distanceTo(focus.pos) : this.camera.position.length();
    this._hud('speed', Math.round(this.speed).toString().padStart(3, '0'));
    this._hud('distance', (distToTarget * 1.4e3).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' km');
    this._hud('mode', this.active ? (distToTarget > focus.size * this.dockDist * 1.6 ? 'MENUJU TUJUAN' : 'MENGORBIT') : 'ORBIT BEBAS');

    this.renderer.render(this.scene, this.camera);
  }
}

if (!customElements.get('solar-system')) customElements.define('solar-system', SolarSystem);

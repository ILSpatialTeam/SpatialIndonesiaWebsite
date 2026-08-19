import * as THREE from 'https://unpkg.com/three@0.184.0/build/three.module.js';

const INK = 0x121116, ACCENT = 0x6a5ae0, MINT = 0xa99bf2, PAPER = 0xf3f2f8;

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;

class SpatialScene extends HTMLElement {
  connectedCallback() {
    if (this._booted) return;
    this._booted = true;
    this.style.display = 'block';
    this.style.width = '100%';
    this.style.height = '100%';

    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;cursor:grab';
    this.appendChild(canvas);
    this.canvas = canvas;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.xr.enabled = true;
    this.renderer = renderer;

    const scene = new THREE.Scene();
    this.scene = scene;

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 0, 5.4);
    this.camera = camera;

    const rig = new THREE.Group();
    rig.name = 'rig';
    scene.add(rig);
    this.rig = rig;

    const field = new THREE.Group();
    field.name = 'spatialField';
    rig.add(field);
    this.field = field;

    // point cloud shell — the "spatial mesh"
    const shellGeo = new THREE.IcosahedronGeometry(1.62, 6);
    const cloud = new THREE.Points(
      shellGeo,
      new THREE.PointsMaterial({ color: MINT, size: 0.014, transparent: true, opacity: 0.62, sizeAttenuation: true })
    );
    cloud.name = 'meshCloud';
    field.add(cloud);

    // wireframe scaffold
    const wire = new THREE.LineSegments(
      new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(1.66, 1)),
      new THREE.LineBasicMaterial({ color: PAPER, transparent: true, opacity: 0.16 })
    );
    wire.name = 'scaffold';
    field.add(wire);

    // solid core
    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.72, 0),
      new THREE.MeshStandardMaterial({ color: 0x1c1930, roughness: 0.35, metalness: 0.5, flatShading: true })
    );
    core.name = 'core';
    field.add(core);

    const coreEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(core.geometry),
      new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.85 })
    );
    coreEdges.name = 'coreEdges';
    core.add(coreEdges);

    // three rings — AR / VR / XR
    this.rings = [];
    const ringSpecs = [
      { r: 2.12, color: ACCENT, rot: [Math.PI / 2.1, 0, 0.28], op: 0.7 },
      { r: 2.42, color: MINT, rot: [Math.PI / 2.6, 0.9, -0.5], op: 0.5 },
      { r: 2.72, color: PAPER, rot: [Math.PI / 1.8, -0.6, 0.9], op: 0.24 }
    ];
    ringSpecs.forEach((s, i) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(s.r, 0.006, 6, 220),
        new THREE.MeshBasicMaterial({ color: s.color, transparent: true, opacity: s.op })
      );
      ring.name = 'ring' + i;
      ring.rotation.set(...s.rot);
      field.add(ring);
      this.rings.push(ring);
    });

    // anchors drifting in the volume
    this.anchors = [];
    const anchorGeo = new THREE.OctahedronGeometry(0.062, 0);
    const anchorMat = new THREE.MeshStandardMaterial({ color: PAPER, roughness: 0.4, metalness: 0.2, emissive: 0x1e1a3a });
    for (let i = 0; i < 22; i++) {
      const a = new THREE.Mesh(anchorGeo, anchorMat);
      a.name = 'anchor' + i;
      const rad = 2.0 + Math.random() * 1.6;
      const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
      a.position.set(rad * Math.sin(ph) * Math.cos(th), rad * Math.cos(ph) * 0.7, rad * Math.sin(ph) * Math.sin(th));
      a.userData.seed = Math.random() * 10;
      field.add(a);
      this.anchors.push(a);
    }

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const key = new THREE.PointLight(ACCENT, 22, 14); key.position.set(3, 2.4, 3.4); scene.add(key);
    const fill = new THREE.PointLight(MINT, 14, 14); fill.position.set(-3.4, -1.6, -2.2); scene.add(fill);
    scene.fog = new THREE.FogExp2(INK, 0.055);

    this.drag = { on: false, x: 0, y: 0, vx: 0, vy: 0, ry: 0, rx: 0 };
    canvas.addEventListener('pointerdown', e => {
      this.drag.on = true; this.drag.x = e.clientX; this.drag.y = e.clientY;
      canvas.setPointerCapture(e.pointerId); canvas.style.cursor = 'grabbing';
    });
    canvas.addEventListener('pointermove', e => {
      if (!this.drag.on) return;
      this.drag.vx += (e.clientX - this.drag.x) * 0.0045;
      this.drag.vy += (e.clientY - this.drag.y) * 0.0035;
      this.drag.x = e.clientX; this.drag.y = e.clientY;
    });
    const end = () => { this.drag.on = false; canvas.style.cursor = 'grab'; };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);

    this.pointer = { x: 0, y: 0 };
    window.addEventListener('pointermove', e => {
      this.pointer.x = (e.clientX / innerWidth) * 2 - 1;
      this.pointer.y = (e.clientY / innerHeight) * 2 - 1;
    }, { passive: true });

    this._resize = () => {
      const w = this.clientWidth || innerWidth, h = this.clientHeight || innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
    };
    this._resize();
    this._ro = new ResizeObserver(this._resize); this._ro.observe(this);

    this.progress = 0;
    this._scroll = () => {
      const stage = document.getElementById('xr-stage');
      if (!stage) return;
      const r = stage.getBoundingClientRect();
      const span = Math.max(1, r.height - innerHeight);
      this.progress = clamp(-r.top / span, 0, 1);
    };
    this._scroll();
    addEventListener('scroll', this._scroll, { passive: true });
    addEventListener('resize', this._scroll);

    this.clock = new THREE.Clock();
    renderer.setAnimationLoop(() => this._frame());

    if (navigator.xr) {
      navigator.xr.isSessionSupported('immersive-vr').then(ok => {
        this.dispatchEvent(new CustomEvent('xr-support', { detail: { ok }, bubbles: true }));
      }).catch(() => {});
    }
    requestAnimationFrame(() => this.dispatchEvent(new CustomEvent('scene-ready', { bubbles: true })));
  }

  // camera keyframes across the scroll stage
  _cam(p) {
    const keys = [
      { pos: [0, 0, 5.4], look: [0, 0, 0], fov: 42 },
      { pos: [2.9, 1.15, 3.1], look: [0, 0.1, 0], fov: 46 },
      { pos: [-1.4, -0.5, 6.9], look: [0.2, 0.3, 0], fov: 40 }
    ];
    const t = p * (keys.length - 1);
    const i = Math.min(keys.length - 2, Math.floor(t));
    const f = t - i, e = f * f * (3 - 2 * f);
    const a = keys[i], b = keys[i + 1];
    this.camera.position.set(lerp(a.pos[0], b.pos[0], e), lerp(a.pos[1], b.pos[1], e), lerp(a.pos[2], b.pos[2], e));
    const fov = lerp(a.fov, b.fov, e);
    if (Math.abs(fov - this.camera.fov) > 0.01) { this.camera.fov = fov; this.camera.updateProjectionMatrix(); }
    this._look = this._look || new THREE.Vector3();
    this._look.set(lerp(a.look[0], b.look[0], e), lerp(a.look[1], b.look[1], e), lerp(a.look[2], b.look[2], e));
    this.camera.lookAt(this._look);
  }

  _frame() {
    const t = this.clock.getElapsedTime();
    const d = this.drag;
    d.ry += d.vx; d.rx = clamp(d.rx + d.vy, -0.8, 0.8);
    d.vx *= 0.92; d.vy *= 0.92;

    this.field.rotation.y = t * 0.07 + d.ry;
    this.field.rotation.x = d.rx + Math.sin(t * 0.22) * 0.05;
    this.rings.forEach((r, i) => { r.rotation.z += 0.0016 * (i + 1); });
    this.anchors.forEach(a => {
      const s = a.userData.seed;
      a.position.y += Math.sin(t * 0.6 + s) * 0.0009;
      a.rotation.x = t * 0.3 + s; a.rotation.y = t * 0.22 + s;
    });

    if (!this.renderer.xr.isPresenting) {
      this._cam(this.progress);
      this.rig.rotation.y = lerp(this.rig.rotation.y, -this.pointer.x * 0.12, 0.05);
      this.rig.rotation.x = lerp(this.rig.rotation.x, this.pointer.y * 0.08, 0.05);
      this.rig.position.z = 0;
    } else {
      this.rig.rotation.set(0, 0, 0);
      this.rig.position.set(0, 1.4, -3.2);
    }
    this.renderer.render(this.scene, this.camera);
  }

  async enterVR() {
    if (!navigator.xr) throw new Error('WebXR tidak tersedia di browser ini');
    const session = await navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor', 'bounded-floor'] });
    await this.renderer.xr.setSession(session);
    session.addEventListener('end', () => this._resize());
    return session;
  }
}

if (!customElements.get('spatial-scene')) customElements.define('spatial-scene', SpatialScene);

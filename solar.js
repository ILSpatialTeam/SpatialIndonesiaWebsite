import * as THREE from 'https://unpkg.com/three@0.184.0/build/three.module.js';
import { ARTICLES, CATEGORIES, FREQ } from './insight-data.js';

const ACCENT = 0x6a5ae0, MINT = 0xa99bf2, PAPER = 0xf3f2f8, INK = 0x121116, DEEP = 0x2a1fc9;
// point sprites are sized in world units and ignore the object's scale, so these
// bases have to be re-multiplied by world.scale every frame (see _frameBody)
const STAR_SIZE = 1.35, DUST_SIZE = 0.38;
// comet trail: samples kept in the ring buffer, and the head's base sprite size
const COMET_TRAIL = 96, COMET_SIZE = 2.4;
// meteor mode: trail samples per rock, where they enter the system from, the
// starting hull integrity, and the shortest gap between two laser bolts
const MET_TRAIL = 24, MET_SPAWN_R = 86, MET_HEALTH = 100, MET_COOL = 0.11;
// insight moons: base sprite size for one sparing satellite, and the reveal
// threshold above which moons start taking pointer hits away from the planet
const MOON_LIVE = 0.35;
// how close the camera parks to a moon while reading, as a multiple of its radius
const READ_DOCK = 3.6;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;

const PLANETS = [
  { id: 'program', label: 'Program', orbit: 11, size: 0.9, color: MINT, speed: 0.085, phase: 0.4, kind: 'ringed' },
  { id: 'karya', label: 'Karya', orbit: 15.5, size: 1.15, color: ACCENT, speed: 0.062, phase: 2.1, kind: 'dodeca' },
  { id: 'event', label: 'Event', orbit: 20, size: 0.85, color: PAPER, speed: 0.048, phase: 4.0, kind: 'wire' },
  // deep blue reads as the far end of the brand gradient
  { id: 'insight', label: 'Insight', orbit: 25, size: 1.0, color: DEEP, speed: 0.038, phase: 5.4, kind: 'torus' },
  { id: 'tim', label: 'Tim', orbit: 30, size: 0.8, color: PAPER, speed: 0.03, phase: 1.2, kind: 'cluster' },
  { id: 'gabung', label: 'Gabung', orbit: 35.5, size: 1.3, color: ACCENT, speed: 0.024, phase: 3.3, kind: 'glow' }
];

// Condensed content for the in-headset panels (the DOM panels keep the full version).
const PANELS = {
  inti: {
    no: '00', tag: 'Inti', accent: '#9E94F9',
    title: 'Opening Access of Emerging Spatial Technology',
    lead: 'Teknologi spatial seharusnya bisa diakses siapa pun, dari mana pun di Indonesia.',
    items: [
      { k: '01', d: 'Membuat teknologi spatial lebih accessible bagi semua.' },
      { k: '02', d: 'Membangun kolaborasi untuk mendorong inovasi spatial.' },
      { k: '03', d: 'Mengembangkan talenta teknologi spatial masa depan.' },
      { k: '04', d: 'Menciptakan teknologi spatial yang meaningful dan berdampak.' }
    ]
  },
  program: {
    no: '01', tag: 'Program', accent: '#a99bf2',
    title: 'Program & kegiatan',
    lead: 'Semua terbuka untuk publik. Tidak perlu headset sendiri untuk mulai ikut.',
    items: [
      { k: 'Bulanan', t: 'XR Meetup', d: 'Demo karya, tanya jawab, coba perangkat bareng.' },
      { k: 'Belajar', t: 'Workshop & bootcamp', d: 'Kelas praktik: WebXR, Unity, three.js, desain interaksi.' },
      { k: 'Kolaborasi', t: 'Open Build', d: 'Proyek bareng lintas disiplin, dari ide sampai rilis.' },
      { k: 'Kampus', t: 'Kelas keliling', d: 'Pengenalan teknologi spatial ke kampus dan sekolah.' }
    ]
  },
  karya: {
    no: '02', tag: 'Karya', accent: '#9E94F9',
    title: 'Karya member',
    lead: 'Proyek VR, AR, dan XR yang dibangun oleh member komunitas.',
    items: [
      { k: 'VR · Edukasi', t: 'Judul proyek', d: 'Deskripsi singkat dan nama member pembuatnya.' },
      { k: 'AR · Budaya', t: 'Judul proyek', d: 'Deskripsi singkat dan nama member pembuatnya.' },
      { k: 'XR · Industri', t: 'Judul proyek', d: 'Deskripsi singkat dan nama member pembuatnya.' }
    ]
  },
  event: {
    no: '03', tag: 'Event', accent: '#f3f2f8',
    title: 'Event & meetup',
    lead: 'Jadwal terdekat komunitas.',
    items: [
      { k: 'Bulan ini', t: 'XR Meetup — demo malam', d: 'Jakarta · Terbuka' },
      { k: 'Segera', t: 'Workshop WebXR untuk pemula', d: 'Online · Kuota terbatas' },
      { k: 'Rencana', t: 'Open Build showcase day', d: 'Bandung · Menunggu tanggal' }
    ]
  },
  insight: {
    no: '04', tag: 'Insight', accent: '#a99bf2',
    title: 'Sistem Insight',
    lead: 'Tiap artikel satu bulan yang mengorbit planet ini. Buka di layar biasa untuk membaca dan ikut sparing.',
    items: ARTICLES.filter(a => !a.archived).slice(0, 4).map(a => ({
      k: (CATEGORIES[a.cat] || {}).label || 'Insight', t: a.title, d: a.lead
    }))
  },
  tim: {
    no: '05', tag: 'Tim', accent: '#f3f2f8',
    title: 'Tim inti',
    lead: 'Relawan yang menjaga ritme komunitas.',
    items: [
      { k: '01', t: 'Nama', d: 'Peran' },
      { k: '02', t: 'Nama', d: 'Peran' },
      { k: '03', t: 'Nama', d: 'Peran' },
      { k: '04', t: 'Nama', d: 'Peran' }
    ]
  },
  gabung: {
    no: '06', tag: 'Gabung', accent: '#9E94F9',
    title: 'Ikut bangun ruangnya',
    lead: 'Gratis dan terbuka untuk semua level, tidak wajib punya headset, dari kota mana pun.',
    items: [
      { k: 'Langkah', t: 'Isi form pendaftaran', d: 'Buka planet Gabung di layar biasa untuk mengisi form.' },
      { k: 'Kanal', t: 'Instagram · Discord · LinkedIn', d: 'Sapa kami lebih dulu kalau mau kenalan.' }
    ]
  }
};

const NAV = [{ id: 'inti', label: 'Inti — Visi & Misi' }].concat(PLANETS.map(p => ({ id: p.id, label: p.label })));

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

// soft radial-gradient disc, used for the sun corona and glowing particles
function glowTexture(size, stops) {
  const c = makeCanvas(size, size);
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([o, col]) => grad.addColorStop(o, col));
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}

function wrap(ctx, text, maxW) {
  const words = String(text).split(' ');
  const out = [];
  let line = '';
  words.forEach(w => {
    const t = line ? line + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w; }
    else line = t;
  });
  if (line) out.push(line);
  return out;
}

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

    const camera = new THREE.PerspectiveCamera(52, 1, 0.05, 400);
    camera.position.set(0, 16, 52);
    this.camera = camera;

    const world = new THREE.Group();
    world.name = 'solarSystem';
    scene.add(world);
    this.world = world;

    const starPos = [];
    for (let i = 0; i < 2600; i++) {
      const r = 90 + Math.random() * 130;
      const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
      starPos.push(r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph), r * Math.sin(ph) * Math.sin(th));
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
    // shared soft-glow sprite so every point reads as a small light, not a hard square
    const particleMap = glowTexture(64, [
      [0, 'rgba(255,255,255,1)'],
      [0.22, 'rgba(243,242,248,.9)'],
      [0.5, 'rgba(169,155,242,.32)'],
      [1, 'rgba(169,155,242,0)']
    ]);
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
      color: PAPER, size: STAR_SIZE, map: particleMap, transparent: true, opacity: 0.85,
      sizeAttenuation: true, blending: THREE.AdditiveBlending, depthWrite: false
    }));
    this.particleMap = particleMap;
    stars.name = 'stars';
    world.add(stars);
    this.stars = stars;
    this.baseFog = scene.fog;

    const dustPos = [];
    for (let i = 0; i < 900; i++) {
      const r = 8 + Math.random() * 34, th = Math.random() * Math.PI * 2;
      dustPos.push(Math.cos(th) * r, (Math.random() - 0.5) * 2.4, Math.sin(th) * r);
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.Float32BufferAttribute(dustPos, 3));
    const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
      color: MINT, size: DUST_SIZE, map: particleMap, transparent: true, opacity: 0.55,
      sizeAttenuation: true, blending: THREE.AdditiveBlending, depthWrite: false
    }));
    world.add(dust);
    this.dust = dust;

    const sun = new THREE.Group();
    sun.name = 'inti';
    const sunCore = new THREE.Mesh(
      new THREE.IcosahedronGeometry(3, 3),
      new THREE.MeshStandardMaterial({ color: 0x241c4a, emissive: ACCENT, emissiveIntensity: 2.4, roughness: 0.6, flatShading: true })
    );
    sunCore.name = 'intiCore';
    sun.add(sunCore);
    const sunWire = new THREE.LineSegments(
      new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(4.1, 1)),
      new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.3 })
    );
    sun.add(sunWire);
    this.sunWire = sunWire;
    // corona: two camera-facing gradient discs — a hot bright heart fading through
    // the brand purples into deep blue, plus a wide faint outer haze
    const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture(256, [
        [0, 'rgba(255,255,255,.95)'],
        [0.16, 'rgba(216,208,255,.85)'],
        [0.38, 'rgba(158,148,249,.5)'],
        [0.68, 'rgba(106,90,224,.18)'],
        [1, 'rgba(42,31,201,0)']
      ]),
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
    }));
    sunGlow.name = 'intiGlow';
    sunGlow.scale.set(15, 15, 1);
    sun.add(sunGlow);
    this.sunGlow = sunGlow;
    const sunHaze = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture(256, [
        [0, 'rgba(169,155,242,.4)'],
        [0.45, 'rgba(106,90,224,.14)'],
        [1, 'rgba(42,31,201,0)']
      ]),
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
    }));
    sunHaze.name = 'intiHaze';
    sunHaze.scale.set(30, 30, 1);
    sun.add(sunHaze);
    this.sunHaze = sunHaze;
    const sunLight = new THREE.PointLight(ACCENT, 1200, 140);
    sun.add(sunLight);
    this.sunLight = sunLight;
    const sunHit = new THREE.Mesh(new THREE.SphereGeometry(4.6, 12, 12), new THREE.MeshBasicMaterial({ visible: false }));
    sunHit.userData.planetId = 'inti';
    sun.add(sunHit);
    world.add(sun);
    this.sun = sun;
    this.sunCore = sunCore;

    const amb = new THREE.AmbientLight(0xffffff, 0.42); scene.add(amb);
    const rim = new THREE.DirectionalLight(DEEP, 1.6); rim.position.set(-30, 22, -18); scene.add(rim);
    const cool = new THREE.DirectionalLight(MINT, 0.5); cool.position.set(24, -14, 20); scene.add(cool);
    this.sysLights = [[amb, 0.42], [rim, 1.6], [cool, 0.5]];
    this.readDim = 0;

    this.planets = PLANETS.map(p => {
      const g = new THREE.Group();
      g.name = p.id;
      let mesh;
      const mat = new THREE.MeshStandardMaterial({ color: p.color, roughness: 0.42, metalness: 0.32, flatShading: p.kind !== 'glow' });
      mat.name = p.id + 'Material';
      if (p.kind === 'ringed') {
        mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(p.size, 2), mat);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(p.size * 1.9, 0.03, 6, 90), new THREE.MeshBasicMaterial({ color: p.color, transparent: true, opacity: 0.6 }));
        ring.rotation.set(Math.PI / 2.3, 0.3, 0);
        g.add(ring);
      } else if (p.kind === 'dodeca') {
        mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(p.size, 0), mat);
      } else if (p.kind === 'wire') {
        mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(p.size, 1), mat);
        g.add(new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(p.size * 1.45, 1)), new THREE.LineBasicMaterial({ color: p.color, transparent: true, opacity: 0.35 })));
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
        mesh = new THREE.Mesh(new THREE.SphereGeometry(p.size, 32, 32), new THREE.MeshStandardMaterial({ color: p.color, emissive: p.color, emissiveIntensity: 0.45, roughness: 0.3 }));
        g.add(new THREE.Mesh(new THREE.SphereGeometry(p.size * 1.7, 24, 24), new THREE.MeshBasicMaterial({ color: p.color, transparent: true, opacity: 0.1 })));
      }
      mesh.name = p.id + 'Body';
      g.add(mesh);

      const hit = new THREE.Mesh(new THREE.SphereGeometry(Math.max(2.6, p.size * 3), 12, 12), new THREE.MeshBasicMaterial({ visible: false }));
      hit.userData.planetId = p.id;
      g.add(hit);

      // 3D name tag, shown inside the headset where DOM labels can't reach
      const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: this._tagTexture(p.label, p.color), transparent: true, depthWrite: false }));
      tag.scale.set(7.4, 1.85, 1);
      tag.position.y = Math.max(2.2, p.size * 2.6);
      tag.visible = false;
      g.add(tag);

      const orbitPts = [];
      for (let i = 0; i <= 160; i++) {
        const a = (i / 160) * Math.PI * 2;
        orbitPts.push(new THREE.Vector3(Math.cos(a) * p.orbit, 0, Math.sin(a) * p.orbit));
      }
      const path = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(orbitPts), new THREE.LineBasicMaterial({ color: PAPER, transparent: true, opacity: 0.09 }));
      path.name = p.id + 'Orbit';
      world.add(path);
      world.add(g);
      return Object.assign({}, p, { group: g, mesh, hit, path, tag });
    });

    const sunTag = new THREE.Sprite(new THREE.SpriteMaterial({ map: this._tagTexture('Inti — Visi & Misi', ACCENT), transparent: true, depthWrite: false }));
    sunTag.scale.set(13, 3.25, 1);
    sunTag.position.y = 6.4;
    sunTag.visible = false;
    sun.add(sunTag);
    this.sunTag = sunTag;

    this.hits = this.planets.map(p => p.hit).concat([sunHit]);
    this.ray = new THREE.Raycaster();
    this.ndc = new THREE.Vector2();
    this.pointer = { x: 0, y: 0 };
    this.yaw = 0; this.pitch = 0.34; this.dist = 56; this.dockDist = 7.2;
    this.active = null; this.hover = null;
    this.lookAt = new THREE.Vector3();
    this.desired = new THREE.Vector3();
    this.tmp = new THREE.Vector3();
    this.tmp2 = new THREE.Vector3();
    this.prevPos = camera.position.clone();
    this.speed = 0;

    this._buildMoons();
    this._buildXRUI();
    this._buildLens();
    this._buildComet();
    this._buildMeteors();
    this._bindInput();

    this._resize = () => {
      const w = this.clientWidth || innerWidth, h = this.clientHeight || innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      const portrait = h > w;
      camera.fov = portrait ? 66 : 52;
      this.baseFov = camera.fov;
      if (portrait && !this._portraitDone) { this.dist = 74; this._portraitDone = true; }
      camera.updateProjectionMatrix();
    };
    this._resize();
    this._ro = new ResizeObserver(this._resize); this._ro.observe(this);

    this.clock = new THREE.Clock();
    renderer.setAnimationLoop((t, frame) => this._frame(frame));

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => this._refreshTextures());
    }
    const announce = (ok, reason) => this.dispatchEvent(new CustomEvent('xr-support', { detail: { ok: !!ok, reason: reason || '' }, bubbles: true }));
    if (navigator.xr) {
      navigator.xr.isSessionSupported('immersive-vr')
        .then(ok => announce(ok))
        .catch(err => announce(false, (err && err.name === 'SecurityError') ? 'blocked' : 'error'));
      navigator.xr.isSessionSupported('immersive-ar')
        .then(ok => this.dispatchEvent(new CustomEvent('ar-support', { detail: { ok: !!ok }, bubbles: true })))
        .catch(() => this.dispatchEvent(new CustomEvent('ar-support', { detail: { ok: false }, bubbles: true })));
    } else {
      announce(false, 'unsupported');
      this.dispatchEvent(new CustomEvent('ar-support', { detail: { ok: false }, bubbles: true }));
    }
    requestAnimationFrame(() => this.dispatchEvent(new CustomEvent('scene-ready', { bubbles: true })));
  }

  _buildLens() {
    this.lens = { on: false, x: 0.5, y: 0.5, vx: 0, vy: 0, s: 0, mass: 1 };
    const dpr = Math.min(devicePixelRatio, 2);
    this.rt = new THREE.WebGLRenderTarget(2, 2, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
    this.rtDpr = dpr;

    this.lensMat = new THREE.ShaderMaterial({
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        tDiffuse: { value: this.rt.texture },
        uCenter: { value: new THREE.Vector2(0.5, 0.5) },
        uVel: { value: new THREE.Vector2(0, 0) },
        uStrength: { value: 0 },
        uAspect: { value: 1 },
        uTime: { value: 0 }
      },
      vertexShader: [
        'varying vec2 vUv;',
        'void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }'
      ].join('\n'),
      fragmentShader: [
        'precision highp float;',
        'uniform sampler2D tDiffuse;',
        'uniform vec2 uCenter;',
        'uniform vec2 uVel;',
        'uniform float uStrength;',
        'uniform float uAspect;',
        'uniform float uTime;',
        'varying vec2 vUv;',
        'void main() {',
        '  vec2 d = vUv - uCenter;',
        '  d.x *= uAspect;',
        '  float r = max(length(d), 1e-4);',
        '  float rs = 0.052 * uStrength;',
        // Schwarzschild-ish deflection: falls off as 1/r^2, capped near the horizon
        '  float pull = clamp((rs * rs) / (r * r), 0.0, 2.4);',
        // frame dragging: space is twisted around the hole, and dragged along cursor motion
        '  float swirl = pull * (1.75 + 0.35 * sin(uTime * 0.7));',
        '  float ca = cos(swirl), sa = sin(swirl);',
        '  vec2 dr = vec2(d.x * ca - d.y * sa, d.x * sa + d.y * ca);',
        '  dr *= 1.0 - clamp(pull, 0.0, 0.93);',
        '  dr += uVel * pull * 0.85;',
        '  dr.x /= uAspect;',
        '  vec2 suv = uCenter + dr;',
        // light splits as it grazes the horizon
        '  float ab = pull * 0.010;',
        '  vec4 c;',
        '  c.r = texture2D(tDiffuse, suv + vec2(ab, 0.0)).r;',
        '  c.g = texture2D(tDiffuse, suv).g;',
        '  c.b = texture2D(tDiffuse, suv - vec2(ab, 0.0)).b;',
        '  c.a = texture2D(tDiffuse, suv).a;',
        // shadow and photon ring
        '  float sh = smoothstep(rs * 1.0, rs * 0.42, r);',
        '  c.rgb *= 1.0 - sh;',
        '  c.a = max(c.a, sh * 0.97);',
        '  float ring = exp(-pow((r - rs * 1.1) / max(rs * 0.28, 1e-4), 2.0));',
        '  vec3 glow = mix(vec3(0.42, 0.35, 0.88), vec3(0.66, 0.61, 0.95), 0.35 + 0.35 * sin(uTime * 0.8));',
        '  c.rgb += glow * ring * 0.62 * uStrength;',
        '  c.a = max(c.a, ring * 0.6 * uStrength);',
        '  gl_FragColor = c;',
        '}'
      ].join('\n')
    });

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.lensMat);
    quad.frustumCulled = false;
    quad.name = 'lensQuad';
    this.lensScene = new THREE.Scene();
    this.lensScene.add(quad);
    this.lensCam = new THREE.Camera();
  }

  setLens(o) {
    if (!this.lens) return;
    Object.assign(this.lens, o);
  }

  _present() {
    const L = this.lens;
    if (!L || !L.on || L.s < 0.02 || this.renderer.xr.isPresenting) {
      this.renderer.setRenderTarget(null);
      this.renderer.render(this.scene, this.camera);
      return;
    }
    const w = Math.max(2, Math.floor(this.clientWidth * this.rtDpr));
    const h = Math.max(2, Math.floor(this.clientHeight * this.rtDpr));
    if (this.rt.width !== w || this.rt.height !== h) this.rt.setSize(w, h);

    this.renderer.setRenderTarget(this.rt);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(null);

    const u = this.lensMat.uniforms;
    u.uCenter.value.set(L.x, 1 - L.y);
    u.uVel.value.set(L.vx, -L.vy);
    u.uStrength.value = L.s * L.mass;
    u.uAspect.value = this.clientWidth / Math.max(1, this.clientHeight);
    u.uTime.value = this.clock.getElapsedTime();
    this.renderer.render(this.lensScene, this.lensCam);
  }

  disconnectedCallback() {
    removeEventListener('keydown', this._keys);
    removeEventListener('blur', this._cease);
    removeEventListener('pointerup', this._cease, true);
    removeEventListener('pointercancel', this._cease, true);
    document.removeEventListener('visibilitychange', this._hidden);
    if (this.renderer) this.renderer.setAnimationLoop(null);
    if (this._ro) this._ro.disconnect();
  }

  /* ---------- textures ---------- */

  _tagTexture(text, color) {
    const c = makeCanvas(740, 185);
    const g = c.getContext('2d');
    const hex = '#' + new THREE.Color(color).getHexString();
    g.fillStyle = 'rgba(18,17,22,.72)';
    g.strokeStyle = 'rgba(243,242,248,.28)';
    g.lineWidth = 3;
    const r = 78;
    g.beginPath();
    g.moveTo(r, 8); g.lineTo(c.width - r, 8); g.quadraticCurveTo(c.width - 8, 8, c.width - 8, 92);
    g.quadraticCurveTo(c.width - 8, 177, c.width - r, 177); g.lineTo(r, 177);
    g.quadraticCurveTo(8, 177, 8, 92); g.quadraticCurveTo(8, 8, r, 8);
    g.closePath(); g.fill(); g.stroke();
    g.fillStyle = hex;
    g.beginPath(); g.arc(66, 93, 15, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#f3f2f8';
    g.font = "600 62px 'Poppins', system-ui, sans-serif";
    g.textBaseline = 'middle';
    g.fillText(text, 104, 97);
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 4;
    return t;
  }

  _buttonTexture(label, state) {
    const c = makeCanvas(680, 130);
    const g = c.getContext('2d');
    g.fillStyle = state === 'active' ? 'rgba(106,90,224,.22)' : (state === 'hover' ? 'rgba(169,155,242,.16)' : 'rgba(18,17,22,.8)');
    g.fillRect(0, 0, c.width, c.height);
    g.strokeStyle = state === 'active' ? '#9E94F9' : (state === 'hover' ? '#a99bf2' : 'rgba(243,242,248,.22)');
    g.lineWidth = 4;
    g.strokeRect(2, 2, c.width - 4, c.height - 4);
    g.fillStyle = '#f3f2f8';
    g.font = "500 52px 'Instrument Sans', system-ui, sans-serif";
    g.textBaseline = 'middle';
    g.fillText(label, 34, 68);
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 4;
    return t;
  }

  _promptTexture(text) {
    const c = makeCanvas(880, 220);
    const g = c.getContext('2d');
    g.fillStyle = 'rgba(18,17,22,.84)';
    g.fillRect(0, 0, c.width, c.height);
    g.strokeStyle = 'rgba(169,155,242,.55)';
    g.lineWidth = 5;
    g.strokeRect(3, 3, c.width - 6, c.height - 6);
    g.fillStyle = '#a99bf2';
    g.font = "500 30px 'Instrument Sans', system-ui, sans-serif";
    g.textBaseline = 'top';
    g.fillText('MODE AR', 44, 40);
    g.fillStyle = '#f3f2f8';
    g.font = "600 44px 'Poppins', system-ui, sans-serif";
    let y = 96;
    wrap(g, text, c.width - 88).forEach(l => { g.fillText(l, 44, y); y += 52; });
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 4;
    return t;
  }

  _panelTexture(id) {
    const d = PANELS[id];
    const c = makeCanvas(940, 1180);
    const g = c.getContext('2d');
    g.fillStyle = 'rgba(18,17,22,.94)';
    g.fillRect(0, 0, c.width, c.height);
    g.strokeStyle = 'rgba(243,242,248,.2)';
    g.lineWidth = 5;
    g.strokeRect(3, 3, c.width - 6, c.height - 6);
    g.textBaseline = 'top';

    let y = 62;
    g.fillStyle = d.accent;
    g.font = "500 30px 'Instrument Sans', system-ui, sans-serif";
    g.fillText('PLANET ' + d.no + '  ·  ' + d.tag.toUpperCase(), 56, y);
    y += 62;

    g.fillStyle = '#f3f2f8';
    g.font = "600 62px 'Poppins', system-ui, sans-serif";
    wrap(g, d.title, c.width - 112).forEach(l => { g.fillText(l, 56, y); y += 68; });
    y += 12;

    g.fillStyle = '#b9b4cc';
    g.font = "400 32px 'Instrument Sans', system-ui, sans-serif";
    wrap(g, d.lead, c.width - 112).forEach(l => { g.fillText(l, 56, y); y += 43; });
    y += 26;

    d.items.forEach(it => {
      g.strokeStyle = 'rgba(243,242,248,.14)';
      g.lineWidth = 2;
      g.beginPath(); g.moveTo(56, y); g.lineTo(c.width - 56, y); g.stroke();
      y += 26;
      g.fillStyle = d.accent;
      g.font = "500 26px 'Instrument Sans', system-ui, sans-serif";
      g.fillText(String(it.k).toUpperCase(), 56, y);
      y += 38;
      if (it.t) {
        g.fillStyle = '#f3f2f8';
        g.font = "600 38px 'Poppins', system-ui, sans-serif";
        wrap(g, it.t, c.width - 112).forEach(l => { g.fillText(l, 56, y); y += 46; });
      }
      g.fillStyle = it.t ? '#8f8aa3' : '#f3f2f8';
      g.font = (it.t ? "400 30px" : "400 34px") + " 'Instrument Sans', system-ui, sans-serif";
      wrap(g, it.d, c.width - 112).forEach(l => { g.fillText(l, 56, y); y += 41; });
      y += 24;
    });

    g.fillStyle = '#6c6782';
    g.font = "400 26px 'Instrument Sans', system-ui, sans-serif";
    g.fillText('Arahkan controller ke planet lain untuk berpindah', 56, c.height - 62);
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 4;
    return t;
  }

  _refreshTextures() {
    this.planets.forEach(p => { p.tag.material.map = this._tagTexture(p.label, p.color); p.tag.material.needsUpdate = true; });
    this.sunTag.material.map = this._tagTexture('Inti — Visi & Misi', ACCENT);
    this.sunTag.material.needsUpdate = true;
    this.navBtns.forEach(b => this._setBtn(b, b.userData.state || 'idle', true));
    this._panelCache = {};
    if (this.active) this._setPanel(this.active);
  }

  /* ---------- in-headset UI ---------- */

  _buildXRUI() {
    const root = new THREE.Group();
    root.name = 'xrUI';
    root.visible = false;
    this.scene.add(root);
    this.xrRoot = root;

    // nav dock, to the user's left
    const dock = new THREE.Group();
    dock.name = 'xrNav';
    root.add(dock);
    this.xrDock = dock;

    const head = new THREE.Sprite(new THREE.SpriteMaterial({ map: this._buttonTexture('RENCANA PENERBANGAN', 'idle'), transparent: true, depthWrite: false }));
    head.material.opacity = 0.001;
    this.navBtns = [];
    NAV.forEach((n, i) => {
      const geo = new THREE.PlaneGeometry(0.3, 0.057);
      const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: this._buttonTexture(n.label, 'idle'), transparent: true, side: THREE.DoubleSide }));
      mesh.name = 'navBtn-' + n.id;
      mesh.position.set(0, -i * 0.066, 0);
      mesh.userData = { planetId: n.id, label: n.label, state: 'idle', kind: 'nav' };
      dock.add(mesh);
      this.navBtns.push(mesh);
    });
    const back = new THREE.Mesh(
      new THREE.PlaneGeometry(0.3, 0.057),
      new THREE.MeshBasicMaterial({ map: this._buttonTexture('ORBIT BEBAS', 'idle'), transparent: true, side: THREE.DoubleSide })
    );
    back.name = 'navBtn-free';
    back.position.set(0, -NAV.length * 0.066 - 0.02, 0);
    back.userData = { kind: 'free', label: 'ORBIT BEBAS', state: 'idle' };
    dock.add(back);
    this.navBtns.push(back);

    // meteor mode: the one control that stays reachable once the rocks arrive
    const met = new THREE.Mesh(
      new THREE.PlaneGeometry(0.3, 0.057),
      new THREE.MeshBasicMaterial({ map: this._buttonTexture('MODE METEOR', 'idle'), transparent: true, side: THREE.DoubleSide })
    );
    met.name = 'navBtn-meteor';
    met.position.set(0, -NAV.length * 0.066 - 0.094, 0);
    met.userData = { kind: 'meteor', label: 'MODE METEOR', state: 'idle' };
    dock.add(met);
    this.navBtns.push(met);
    this.metBtn = met;

    // content panel, to the user's right
    const panel = new THREE.Group();
    panel.name = 'xrPanel';
    panel.visible = false;
    root.add(panel);
    this.xrPanel = panel;

    const board = new THREE.Mesh(
      new THREE.PlaneGeometry(0.56, 0.7),
      new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide })
    );
    board.name = 'xrPanelBoard';
    panel.add(board);
    this.xrBoard = board;

    const close = new THREE.Mesh(
      new THREE.PlaneGeometry(0.12, 0.05),
      new THREE.MeshBasicMaterial({ map: this._buttonTexture('TUTUP', 'idle'), transparent: true, side: THREE.DoubleSide })
    );
    close.name = 'xrPanelClose';
    close.position.set(0.22, -0.39, 0.001);
    close.userData = { kind: 'close', label: 'TUTUP', state: 'idle' };
    panel.add(close);
    this.navBtns.push(close);

    // AR-only controls, hidden during VR
    this.arBtns = [];
    [
      { kind: 'move', label: 'PINDAHKAN' },
      { kind: 'near', label: 'DEKATKAN' },
      { kind: 'far', label: 'JAUHKAN' }
    ].forEach((spec, i) => {
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(0.3, 0.057),
        new THREE.MeshBasicMaterial({ map: this._buttonTexture(spec.label, 'idle'), transparent: true, side: THREE.DoubleSide })
      );
      mesh.name = 'arBtn-' + spec.kind;
      mesh.position.set(0, -(NAV.length + 1.4 + i) * 0.066, 0);
      mesh.userData = { kind: spec.kind, label: spec.label, state: 'idle' };
      mesh.visible = false;
      dock.add(mesh);
      this.navBtns.push(mesh);
      this.arBtns.push(mesh);
    });

    this._panelCache = {};
    this.xrTargets = this.navBtns.slice();
    this.xrHome = { yaw: 0, y: 1.5, set: false };

    // gaze reticle with a dwell progress ring, parented to the viewer
    const gaze = new THREE.Group();
    gaze.name = 'gazeReticle';
    gaze.visible = false;
    this.scene.add(gaze);
    this.gaze = gaze;

    const dot = new THREE.Mesh(
      new THREE.CircleGeometry(0.0022, 16),
      new THREE.MeshBasicMaterial({ color: PAPER, transparent: true, opacity: 0.9, depthTest: false })
    );
    dot.name = 'gazeDot';
    dot.renderOrder = 999;
    gaze.add(dot);

    const rim = new THREE.Mesh(
      new THREE.RingGeometry(0.0092, 0.0104, 40),
      new THREE.MeshBasicMaterial({ color: PAPER, transparent: true, opacity: 0.28, depthTest: false })
    );
    rim.name = 'gazeRim';
    rim.renderOrder = 999;
    gaze.add(rim);

    const arc = new THREE.Mesh(
      new THREE.RingGeometry(0.0092, 0.0126, 40, 1, Math.PI / 2, 0.0001),
      new THREE.MeshBasicMaterial({ color: MINT, transparent: true, opacity: 0.95, depthTest: false, side: THREE.DoubleSide })
    );
    arc.name = 'gazeProgress';
    arc.renderOrder = 1000;
    gaze.add(arc);
    this.gazeArc = arc;
    this.gazeDot = dot;
    this.gazeRim = rim;

    this.dwell = { id: null, t: 0, need: 1.2, lockUntil: 0 };
    this.hasController = false;
  }

  _setBtn(mesh, state, force) {
    if (!force && mesh.userData.state === state) return;
    mesh.userData.state = state;
    const map = this._buttonTexture(mesh.userData.label, state);
    if (mesh.material.map) mesh.material.map.dispose();
    mesh.material.map = map;
    mesh.material.needsUpdate = true;
  }

  _setPanel(id) {
    if (!PANELS[id]) return;
    if (!this._panelCache[id]) this._panelCache[id] = this._panelTexture(id);
    this.xrBoard.material.map = this._panelCache[id];
    this.xrBoard.material.needsUpdate = true;
    this._panelVisible(true);
  }

  _panelVisible(on) {
    this.xrPanel.visible = on;
    this.xrPanel.children.forEach(c => { c.visible = on; });
  }

  _bindXRControllers() {
    if (this._ctrlsReady) return;
    this._ctrlsReady = true;
    this.controllers = [];
    for (let i = 0; i < 2; i++) {
      const c = this.renderer.xr.getController(i);
      c.name = 'controller' + i;
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]),
        new THREE.LineBasicMaterial({ color: MINT, transparent: true, opacity: 0.7 })
      );
      line.name = 'ray';
      line.scale.z = 1.2;
      c.add(line);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.008, 12, 12), new THREE.MeshBasicMaterial({ color: ACCENT }));
      tip.name = 'tip';
      c.add(tip);
      c.addEventListener('selectstart', () => { c.userData.trigger = true; this._markController(); this._xrSelect(c); });
      c.addEventListener('selectend', () => { c.userData.trigger = false; });
      c.addEventListener('squeezestart', () => {
        this._markController();
        if (this.met && this.met.on) return;
        this.freeFlight();
      });
      c.addEventListener('connected', e => {
        c.userData.connected = true;
        c.userData.isHand = !!(e.data && e.data.hand);
        const line = c.getObjectByName('ray');
        if (line) line.visible = true;
      });
      c.addEventListener('disconnected', () => {
        c.userData.connected = false;
        const line = c.getObjectByName('ray');
        if (line) line.visible = false;
      });
      this.scene.add(c);
      this.controllers.push(c);
    }
  }

  _markController() {
    this.hasController = true;
    this._resetDwell();
  }

  _resetDwell() {
    this.dwell.id = null;
    this.dwell.t = 0;
    this._setArc(0);
  }

  _setArc(f) {
    const frac = clamp(f, 0, 1);
    if (Math.abs((this._arcFrac || 0) - frac) < 0.012) return;
    this._arcFrac = frac;
    if (this.gazeArc.geometry) this.gazeArc.geometry.dispose();
    this.gazeArc.geometry = new THREE.RingGeometry(0.0092, 0.0126, 40, 1, Math.PI / 2, -Math.max(0.0001, frac * Math.PI * 2));
    this.gazeArc.material.color.set(frac > 0.985 ? ACCENT : MINT);
  }

  _gazeHit(cam) {
    this.tmp.set(0, 0, 0).applyMatrix4(cam.matrixWorld);
    this.tmp2.set(0, 0, -1).transformDirection(cam.matrixWorld).normalize();
    this.ray.set(this.tmp, this.tmp2);
    const ui = this.ray.intersectObjects(this._activeTargets(), false)[0];
    const planet = this.ray.intersectObjects(this.hits, false)[0];
    if (ui && (!planet || ui.distance < planet.distance)) return { kind: 'ui', obj: ui.object, key: ui.object.name };
    if (planet) return { kind: 'planet', id: planet.object.userData.planetId, key: 'planet-' + planet.object.userData.planetId };
    return null;
  }

  _commitGaze(hit) {
    if (hit.kind === 'ui' && hit.obj.userData.kind === 'meteor') return this.setMeteorMode(!(this.met && this.met.on));
    if (this.met && this.met.on) return;
    if (hit.kind === 'planet') return this.travelTo(hit.id);
    const u = hit.obj.userData;
    if (u.kind === 'nav') this.travelTo(u.planetId);
    else this.freeFlight();
  }

  _activeTargets() {
    const ar = this.mode === 'ar';
    return this.xrTargets.filter(o => {
      const k = o.userData && o.userData.kind;
      if ((k === 'move' || k === 'near' || k === 'far') && !ar) return false;
      let n = o;
      while (n) {
        if (n.visible === false) return false;
        n = n.parent;
      }
      return true;
    });
  }

  _xrRay(source) {
    this.tmp.set(0, 0, 0).applyMatrix4(source.matrixWorld);
    this.tmp2.set(0, 0, -1).transformDirection(source.matrixWorld).normalize();
    this.ray.set(this.tmp, this.tmp2);
    const ui = this.ray.intersectObjects(this._activeTargets(), false)[0];
    const planet = this.ray.intersectObjects(this.hits, false)[0];
    if (ui && (!planet || ui.distance < planet.distance)) return { kind: 'ui', obj: ui.object, distance: ui.distance };
    if (planet) return { kind: 'planet', id: planet.object.userData.planetId, distance: planet.distance };
    return null;
  }

  _xrSelect(source) {
    if (this.mode === 'ar') return; // AR is display-only
    if (this.met && this.met.on) {
      const ui = this._xrRay(source);
      if (ui && ui.kind === 'ui' && ui.obj.userData.kind === 'meteor') return this.setMeteorMode(false);
      return this._fireFrom(source);
    }
    const hit = this._xrRay(source);
    if (hit && hit.kind === 'ui') {
      const u = hit.obj.userData;
      if (u.kind === 'nav') return this.travelTo(u.planetId);
      return this.freeFlight();
    }
    if (hit && hit.kind === 'planet') return this.travelTo(hit.id);
  }

  /* ---------- input ---------- */

  _bindInput() {
    const canvas = this.canvas;
    let down = false, moved = 0, lx = 0, ly = 0;
    this.touches = new Map();

    const setNdc = e => {
      const r = canvas.getBoundingClientRect();
      this.ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      this.pointer.x = this.ndc.x; this.pointer.y = this.ndc.y;
    };

    canvas.addEventListener('pointerdown', e => {
      setNdc(e);
      const M = this.met;
      // meteor mode turns the pointer into a trigger: hold to keep the laser on
      if (M && M.on && e.pointerType !== 'touch') {
        M.firing = true;
        this.fireAt(this.ndc);
        canvas.setPointerCapture(e.pointerId);
        return;
      }
      this.touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      down = true; moved = 0; lx = e.clientX; ly = e.clientY;
      canvas.setPointerCapture(e.pointerId);
      this._cursor('grabbing');
    });

    canvas.addEventListener('pointermove', e => {
      if (this.touches.has(e.pointerId)) this.touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      setNdc(e);
      // a pointerup can go missing (window switch, synthetic input); the button
      // state on the next move is the truth about whether the trigger is held
      if (this.met && this.met.firing && e.pointerType !== 'touch' && !e.buttons) this.met.firing = false;
      if (this.touches.size >= 2) {
        const pts = [...this.touches.values()];
        const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        if (this._pinch) {
          const delta = this._pinch - d;
          if (this.active) this.dockDist = clamp(this.dockDist + delta * 0.02, 3.4, 16);
          else this.dist = clamp(this.dist + delta * 0.1, 16, 110);
        }
        this._pinch = d;
        moved = 99;
        return;
      }
      if (down) {
        const dx = e.clientX - lx, dy = e.clientY - ly;
        moved += Math.abs(dx) + Math.abs(dy);
        this.yaw -= dx * 0.0042;
        this.pitch = clamp(this.pitch + dy * 0.003, -0.5, 1.15);
        lx = e.clientX; ly = e.clientY;
      }
    });

    const release = e => {
      if (this.met && this.met.on) this.met.firing = false;
      this.touches.delete(e.pointerId);
      if (this.touches.size < 2) this._pinch = null;
      if (down && moved < 8) this._pick();
      down = false;
      this._cursor(this.hover ? 'pointer' : 'grab');
    };
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', e => {
      if (this.met && this.met.on) this.met.firing = false;
      this.touches.delete(e.pointerId); this._pinch = null; down = false;
    });
    // the pointer can leave the canvas mid-burst; never leave the laser stuck on
    this._cease = () => { if (this.met) this.met.firing = false; };
    this._hidden = () => { if (document.hidden) this._cease(); };
    addEventListener('blur', this._cease);
    addEventListener('pointerup', this._cease, true);
    addEventListener('pointercancel', this._cease, true);
    document.addEventListener('visibilitychange', this._hidden);

    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      if (this.active) this.dockDist = clamp(this.dockDist + e.deltaY * 0.006, 3.4, 16);
      else this.dist = clamp(this.dist + e.deltaY * 0.03, 16, 110);
    }, { passive: false });

    this._keys = e => {
      const M = this.met;
      if (M && M.on) {
        if (e.key === 'Escape') this.setMeteorMode(false);
        else if (e.key === 'r' || e.key === 'R') this.restartMeteor();
        else if (e.key === ' ') this.fireAt(this.ndc);
        else if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') this.yaw -= 0.14;
        else if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') this.yaw += 0.14;
        else if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') this.pitch = clamp(this.pitch + 0.07, -0.35, 0.95);
        else if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') this.pitch = clamp(this.pitch - 0.07, -0.35, 0.95);
        return;
      }
      if (e.key === 'Escape') this.freeFlight();
      else if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') this.dist = clamp(this.dist - 3, 16, 110);
      else if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') this.dist = clamp(this.dist + 3, 16, 110);
      else if (e.key === '0') this.travelTo('inti');
      else if (/^[1-6]$/.test(e.key)) this.travelTo(PLANETS[+e.key - 1].id);
    };
    addEventListener('keydown', this._keys);
  }

  _cursor(v) {
    if (this.dataset.nativeCursor === 'off') { this.canvas.style.cursor = 'none'; return; }
    this.canvas.style.cursor = v;
  }

  _pick() {
    // a tap is a shot while rocks are inbound, never a trip to a planet
    if (this.met && this.met.on) return this.fireAt(this.ndc);
    if (this.read && this.read.slug) return;
    this.ray.setFromCamera(this.ndc, this.camera);
    if (this.moonHits && this.moonReveal > MOON_LIVE) {
      const moon = this.ray.intersectObjects(this.moonHits, false)[0];
      if (moon) return this.openArticle(moon.object.userData.slug);
    }
    const hit = this.ray.intersectObjects(this.hits, false)[0];
    if (hit) this.travelTo(hit.object.userData.planetId);
  }

  /* ---------- insight moons ---------- */

  // Every article is a moon of the Insight planet. Orbit radius carries meaning:
  // live pieces ride close in, the archive drifts out past them.
  _buildMoons() {
    const host = this.planets.find(p => p.id === 'insight');
    if (!host) return;
    const root = new THREE.Group();
    root.name = 'insightMoons';
    host.group.add(root);

    this.moonHost = host;
    this.moonRoot = root;
    this.moonReveal = 0;
    this.moonFocus = null;
    this.hoverMoon = null;
    this.moonPin = null;
    this._moonPos = new THREE.Vector3();
    this._moonOut = new THREE.Vector3(0, 0, 1);
    this._moonFocus = { pos: this._moonPos, out: this._moonOut, size: 0.5 };

    let live = 0;
    this.moons = ARTICLES.map((a, i) => {
      const cat = CATEGORIES[a.cat] || { color: '#a99bf2' };
      const col = new THREE.Color(cat.color).multiplyScalar(0.72);
      const size = 0.15 + clamp(a.read, 2, 14) * 0.014;
      const r = a.archived ? 5.4 + (i - live) * 0.5 : 2.8 + live++ * 0.52;
      const inc = ((i % 2) ? 1 : -1) * (0.09 + (i % 3) * 0.055);

      const node = new THREE.Group();
      node.name = 'moon-' + a.slug;
      root.add(node);

      const mesh = new THREE.Mesh(
        new THREE.IcosahedronGeometry(size, 1),
        new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.1, roughness: 0.62, metalness: 0.12, flatShading: true })
      );
      node.add(mesh);

      // "sudah purnama" marker — dark until the reader reports the last line
      const halo = new THREE.Mesh(
        new THREE.TorusGeometry(size * 1.9, size * 0.055, 6, 40),
        new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0 })
      );
      halo.rotation.x = Math.PI / 2.2;
      node.add(halo);

      const hit = new THREE.Mesh(new THREE.SphereGeometry(Math.max(0.46, size * 3.6), 10, 10), new THREE.MeshBasicMaterial({ visible: false }));
      hit.userData.slug = a.slug;
      node.add(hit);

      const pts = [];
      for (let k = 0; k <= 96; k++) {
        const th = (k / 96) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(th) * r, Math.sin(th) * r * inc, Math.sin(th) * r));
      }
      const path = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0 })
      );
      root.add(path);

      return {
        slug: a.slug, data: a, node, mesh, halo, hit, path,
        r, inc, size, col, read: false,
        speed: 0.42 / Math.sqrt(r), phase: i * 1.94
      };
    });
    this.moonHits = this.moons.map(m => m.hit);
    this._buildReadStage();
  }

  // A lunar surface worth filling a third of the screen with. Drawn once and
  // reused for every article; only the tint changes.
  _craterTexture() {
    const c = makeCanvas(2048, 1024);
    const g = c.getContext('2d');
    g.fillStyle = '#8e8a96';
    g.fillRect(0, 0, c.width, c.height);

    // maria: broad dark plains, the thing that makes a moon readable at a glance
    for (let i = 0; i < 16; i++) {
      const x = Math.random() * c.width, y = 120 + Math.random() * (c.height - 240);
      const r = 90 + Math.random() * 260;
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, 'rgba(78,74,88,.5)');
      grad.addColorStop(0.7, 'rgba(84,80,94,.24)');
      grad.addColorStop(1, 'rgba(84,80,94,0)');
      g.fillStyle = grad;
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
    // craters: a bright rim on one side, a dark floor on the other
    for (let i = 0; i < 420; i++) {
      const x = Math.random() * c.width, y = Math.random() * c.height;
      const r = 3 + Math.pow(Math.random(), 2.6) * 58;
      const grad = g.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
      grad.addColorStop(0, 'rgba(52,49,60,.42)');
      grad.addColorStop(0.72, 'rgba(120,116,130,.2)');
      grad.addColorStop(0.9, 'rgba(206,202,214,.34)');
      grad.addColorStop(1, 'rgba(206,202,214,0)');
      g.fillStyle = grad;
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
    // fine grain so the terminator never looks like clean vector art
    const img = g.getImageData(0, 0, c.width, c.height);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - 0.5) * 22;
      d[i] += n; d[i + 1] += n; d[i + 2] += n;
    }
    g.putImageData(img, 0, 0);

    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 8;
    t.wrapS = THREE.RepeatWrapping;
    return t;
  }

  // The reading stage: one high-detail sphere with its own shader, because
  // three.js layers filter which objects a light reaches only by camera layer —
  // the system's sun and ambient would still wash this moon out and the phase
  // has to be driven purely by reading progress.
  _buildReadStage() {
    const group = new THREE.Group();
    group.name = 'readStage';
    group.visible = false;

    const tex = this._craterTexture();
    tex.colorSpace = THREE.SRGBColorSpace;
    const uni = {
      uMap: { value: tex },
      uLight: { value: new THREE.Vector3(0, 0, 1) },
      uEye: { value: new THREE.Vector3() },
      uTint: { value: new THREE.Color(1, 1, 1) },
      uAmb: { value: 0.03 }
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: uni,
      vertexShader: [
        'varying vec3 vN;',
        'varying vec2 vUv;',
        'varying vec3 vW;',
        'void main() {',
        '  vUv = uv;',
        '  vN = normalize(mat3(modelMatrix) * normal);',
        '  vec4 wp = modelMatrix * vec4(position, 1.0);',
        '  vW = wp.xyz;',
        '  gl_Position = projectionMatrix * viewMatrix * wp;',
        '}'
      ].join('\n'),
      fragmentShader: [
        'uniform sampler2D uMap;',
        'uniform vec3 uLight;',
        'uniform vec3 uEye;',
        'uniform vec3 uTint;',
        'uniform float uAmb;',
        'varying vec3 vN;',
        'varying vec2 vUv;',
        'varying vec3 vW;',
        'void main() {',
        '  vec3 alb = texture2D(uMap, vUv).rgb * uTint;',
        '  vec3 n = normalize(vN);',
        '  float lum = dot(alb, vec3(0.3333));',
        // craters bite into the terminator instead of sitting flat on it
        '  float d = dot(n, normalize(uLight)) + (lum - 0.5) * 0.30;',
        '  float lit = smoothstep(-0.05, 0.15, d);',
        '  vec3 v = normalize(uEye - vW);',
        '  float limb = 0.55 + 0.45 * pow(max(dot(n, v), 0.0), 0.45);',
        '  vec3 col = alb * lit * limb * 1.35;',
        // earthshine keeps the unlit face present instead of a hole in the sky
        '  col += alb * (1.0 - lit) * vec3(0.030, 0.028, 0.062) + alb * uAmb;',
        '  col *= vec3(1.0, 0.972, 0.93);',
        '  gl_FragColor = vec4(col, 1.0);',
        '  #include <colorspace_fragment>',
        '}'
      ].join('\n')
    });

    const body = new THREE.Group();
    body.add(new THREE.Mesh(new THREE.SphereGeometry(1, 128, 128), mat));
    group.add(body);

    const sats = [];
    for (let i = 0; i < 32; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: this.particleMap, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false
      }));
      sp.visible = false;
      group.add(sp);
      sats.push({ sprite: sp, on: 0, item: null, r: 1, a: 0, tilt: 0, spin: 0.2, unlock: 0 });
    }

    this.world.add(group);
    this.read = { group, body, mat, uni, sats, n: 0, p: 0, shown: 0, slug: null, moon: null };
  }

  setSparing(slug, list) {
    const m = this.moons && this.moons.find(x => x.slug === slug);
    if (!m) return;
    m.sparing = (list || []).slice(0, 32);
    if (this.read && this.read.slug === slug) this._layoutSats();
  }

  _layoutSats() {
    const R = this.read, m = R.moon;
    if (!m) return;
    const list = m.sparing || [];
    R.n = Math.min(list.length, R.sats.length);
    R.sats.forEach((s, i) => {
      if (i >= R.n) { s.sprite.visible = false; s.item = null; return; }
      const sp = list[i];
      const f = FREQ[sp.freq] || FREQ.sinyal;
      s.item = sp;
      s.sprite.visible = true;
      s.sprite.material.color.set(f.color);
      // boosted sparing rides tighter; anomali gets a steep, inclined path so a
      // dissenting voice visibly cuts across the ring instead of hiding in it
      s.r = m.size * (2.05 + 1.3 / (1 + (sp.boost || 0) * 0.45)) + (i % 4) * m.size * 0.16;
      s.tilt = sp.freq === 'anomali' ? 0.62 + (i % 3) * 0.12 : 0.05 + (i % 4) * 0.035;
      s.a = (i * 2.3999) % (Math.PI * 2);
      s.spin = 0.09 + (i % 5) * 0.014;
      s.unlock = typeof sp.at01 === 'number' ? sp.at01 : 0;
      s.on = 0;
    });
  }

  // the reader hands back where each sparing sits along the article, 0..1
  setSparingCues(cues) {
    const R = this.read;
    if (!R || !R.slug) return;
    R.sats.forEach(s => { if (s.item && cues[s.item.id] !== undefined) s.unlock = cues[s.item.id]; });
  }

  setReadProgress(p) {
    if (this.read) this.read.p = clamp(p, 0, 1);
  }

  // screen position of one sparing satellite, for the hairline the reader draws
  // from a margin marker up to its light
  satScreenPos(id) {
    const R = this.read;
    if (!R || !R.slug) return null;
    const s = R.sats.find(x => x.item && x.item.id === id);
    if (!s || !s.sprite.visible || s.on < 0.2) return null;
    s.sprite.getWorldPosition(this.tmp);
    this.camera.getWorldDirection(this.tmp2);
    const ahead = (this.tmp.x - this.camera.position.x) * this.tmp2.x
      + (this.tmp.y - this.camera.position.y) * this.tmp2.y
      + (this.tmp.z - this.camera.position.z) * this.tmp2.z;
    if (ahead <= 0) return null;
    this.tmp.project(this.camera);
    return {
      x: (this.tmp.x * 0.5 + 0.5) * this.clientWidth,
      y: (-this.tmp.y * 0.5 + 0.5) * this.clientHeight,
      on: s.on
    };
  }

  markRead(slug, on) {
    const m = this.moons && this.moons.find(x => x.slug === slug);
    if (m) m.read = on !== false;
  }

  pinMoon(slug) { this.moonPin = slug || null; }

  openArticle(slug) {
    const m = this.moons && this.moons.find(x => x.slug === slug);
    if (!m || this.renderer.xr.isPresenting) return;
    if (this.active !== 'insight') this.travelTo('insight');
    this.moonFocus = slug;
    this.dockDist = READ_DOCK;
    this.yaw = -Math.PI * 0.52;
    this.pitch = 0.12;
    m.node.getWorldPosition(this._moonPos);

    const R = this.read;
    R.slug = slug; R.moon = m; R.p = 0; R.shown = 0;
    R.group.visible = true;
    R.uni.uTint.value.copy(new THREE.Color(0xffffff).lerp(m.col, 0.34));
    R.body.rotation.y = m.phase;
    this._layoutSats();

    // the dive: a fast tween with a field-of-view punch, not the usual slow drift
    this.warp = { t: 0, dur: 1.5, from: this.camera.position.clone() };
    this.dispatchEvent(new CustomEvent('insight-open', { detail: { slug }, bubbles: true }));
  }

  closeArticle(silent) {
    if (!this.moonFocus) return;
    this.moonFocus = null;
    this.dockDist = 8.6;
    const R = this.read;
    if (R) { R.slug = null; R.moon = null; R.group.visible = false; R.sats.forEach(s => { s.sprite.visible = false; s.on = 0; }); }
    this.warp = null;
    this.camera.fov = this.baseFov || 52;
    this.camera.updateProjectionMatrix();
    if (!silent) this.dispatchEvent(new CustomEvent('insight-close', { bubbles: true }));
  }

  // one satellite lifting off the surface and settling into the ring
  launchSparing(slug, freq, onArrive) {
    const m = this.moons && this.moons.find(x => x.slug === slug);
    if (!m || this.renderer.xr.isPresenting) { if (onArrive) onArrive(); return; }
    if (!this.launch) {
      const f = new THREE.Sprite(new THREE.SpriteMaterial({
        map: this.particleMap, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
      }));
      f.visible = false;
      this.world.add(f);
      this.launch = { sprite: f, t: 1, from: new THREE.Vector3(), ctrl: new THREE.Vector3(), to: new THREE.Vector3(), moon: null, done: null };
    }
    const L = this.launch;
    const host = this.moonHost;
    const base = this.tmp.copy(host.group.position).add(m.node.position);
    // lift off the limb facing the reader, then arc out into orbit
    const up = this.tmp2.copy(this.camera.position).sub(base).normalize();
    L.from.copy(base).addScaledVector(up, m.size * 1.02);
    L.to.copy(base).addScaledVector(up, m.size * 2.9).add(new THREE.Vector3(0, m.size * 1.4, 0));
    L.ctrl.copy(L.from).addScaledVector(up, m.size * 1.2).add(new THREE.Vector3(0, m.size * 3.4, 0));
    L.sprite.material.color.set((FREQ[freq] || FREQ.sinyal).color);
    L.sprite.visible = true;
    L.t = 0; L.dur = 1.25; L.moon = m; L.done = onArrive || null;
  }

  _updateLaunch(dt) {
    const L = this.launch;
    if (!L || L.t >= 1) return;
    L.t = Math.min(1, L.t + dt / L.dur);
    const e = L.t * L.t * (3 - 2 * L.t), u = 1 - e;
    L.sprite.position.set(0, 0, 0)
      .addScaledVector(L.from, u * u)
      .addScaledVector(L.ctrl, 2 * u * e)
      .addScaledVector(L.to, e * e);
    const sc = (L.moon ? L.moon.size : 0.2) * (1.4 + Math.sin(e * Math.PI) * 1.1) * this.world.scale.x;
    L.sprite.scale.set(sc, sc, 1);
    L.sprite.material.opacity = clamp(L.t < 0.1 ? L.t / 0.1 : 1 - Math.pow(e, 3), 0, 1);
    if (L.t >= 1) {
      L.sprite.visible = false;
      if (L.done) { const d = L.done; L.done = null; d(); }
    }
  }

  _updateRead(t, dt) {
    const R = this.read;
    if (!R || !R.slug) return;
    const m = R.moon;
    R.group.position.copy(this.moonHost.group.position).add(m.node.position);
    R.body.scale.setScalar(m.size);
    R.body.rotation.y += dt * 0.012;

    // phase angle: 0.88*pi is a hairline crescent, 0 is purnama
    R.shown = lerp(R.shown, R.p, 0.06);
    const th = (1 - R.shown) * Math.PI * 0.88;
    const toCam = this.tmp.copy(this.camera.position).sub(R.group.position).normalize();
    const side = this.tmp2.crossVectors(toCam, this.camera.up).normalize();
    R.uni.uLight.value.copy(toCam).multiplyScalar(Math.cos(th))
      .addScaledVector(side, Math.sin(th))
      .addScaledVector(this.camera.up, 0.16)
      .normalize();
    R.uni.uEye.value.copy(this.camera.position);
    R.uni.uAmb.value = 0.008 + R.shown * 0.014;

    const ws = this.world.scale.x;
    for (let i = 0; i < R.n; i++) {
      const s = R.sats[i];
      s.on = lerp(s.on, R.shown >= s.unlock - 0.004 ? 1 : 0, 0.05);
      const a = s.a + t * s.spin;
      s.sprite.position.set(Math.cos(a) * s.r, Math.sin(a * 2) * s.r * s.tilt, Math.sin(a) * s.r);
      const sc = m.size * (0.5 + Math.sin(t * 3 + i) * 0.05) * s.on * ws;
      s.sprite.scale.set(sc, sc, 1);
      s.sprite.material.opacity = s.on * 0.95;
    }
  }

  _updateMoons(t) {
    if (!this.moons) return;
    const near = this.active === 'insight';
    this.moonReveal = lerp(this.moonReveal, near ? 1 : 0, near ? 0.055 : 0.08);
    const rev = this.moonReveal;
    const hovered = this.hoverMoon || this.moonPin;
    const reading = !!(this.read && this.read.slug);

    this.moons.forEach(m => {
      const a = t * m.speed + m.phase;
      m.node.position.set(Math.cos(a) * m.r, Math.sin(a) * m.r * m.inc, Math.sin(a) * m.r);
      m.mesh.rotation.y += 0.006;
      m.mesh.rotation.x += 0.0028;

      const sel = this.moonFocus === m.slug;
      const hov = hovered === m.slug;
      // reading takes over the frame: the stage sphere stands in for this moon,
      // and every orbital annotation gets out of the way
      m.mesh.visible = !(reading && sel);
      m.halo.visible = !reading;
      m.path.visible = !reading;
      if (reading) return;

      const want = (0.4 + rev * 0.6) * (sel ? 1.55 : hov ? 1.28 : 1);
      m.node.scale.setScalar(lerp(m.node.scale.x, want, 0.12));
      m.mesh.material.emissiveIntensity = lerp(m.mesh.material.emissiveIntensity, sel ? 0.42 : hov ? 0.28 : 0.08 + rev * 0.06, 0.1);
      m.path.material.opacity = lerp(m.path.material.opacity, rev * (sel ? 0.34 : hov ? 0.24 : 0.14), 0.08);
      m.halo.material.opacity = lerp(m.halo.material.opacity, m.read ? 0.2 + rev * 0.45 : 0, 0.07);
      m.halo.rotation.z += 0.005;
    });

    if (this.moonFocus) {
      const m = this.moons.find(x => x.slug === this.moonFocus);
      if (m) {
        m.node.getWorldPosition(this._moonPos);
        this.moonHost.group.getWorldPosition(this.tmp2);
        this._moonOut.copy(this._moonPos).sub(this.tmp2);
        if (this._moonOut.lengthSq() < 1e-4) this._moonOut.set(0, 0, 1);
        this._moonOut.normalize();
        this._moonFocus.size = reading ? m.size : Math.max(0.42, m.size * 2.7);
      }
    }
  }

  /* ---------- comet ---------- */

  // A light trail that flies from the planet you were on to the one you picked,
  // so a jump reads as travel instead of a cut. It lives inside `world` so AR/VR
  // scale it with everything else; point sprites ignore object scale, so uSize is
  // re-multiplied by world.scale every frame (same trick as stars and dust).
  _buildComet() {
    const map = glowTexture(64, [
      [0, 'rgba(255,255,255,1)'],
      [0.18, 'rgba(243,242,248,.95)'],
      [0.46, 'rgba(158,148,249,.4)'],
      [1, 'rgba(106,90,224,0)']
    ]);

    const pos = new Float32Array(COMET_TRAIL * 3);
    const life = new Float32Array(COMET_TRAIL);
    // index 0 is the newest sample, so life doubles as "how far back in the tail"
    for (let i = 0; i < COMET_TRAIL; i++) life[i] = 1 - i / COMET_TRAIL;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aLife', new THREE.BufferAttribute(life, 1));
    // only the samples already written get drawn, otherwise the empty tail of the
    // buffer draws a clump of particles at the origin on the first launch
    geo.setDrawRange(0, 0);

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        tGlow: { value: map },
        uSize: { value: COMET_SIZE },
        uFade: { value: 0 }
      },
      vertexShader: [
        'attribute float aLife;',
        'uniform float uSize;',
        'varying float vLife;',
        'void main() {',
        '  vLife = aLife;',
        '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
        '  gl_PointSize = uSize * (0.22 + aLife * 1.78) * (280.0 / max(-mv.z, 0.001));',
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
        // the tail cools from a white-hot head down to the brand violet
        '  vec3 col = mix(vec3(0.42, 0.35, 0.88), vec3(1.0, 0.99, 1.0), vLife * vLife);',
        '  gl_FragColor = vec4(col, 1.0) * a;',
        '}'
      ].join('\n')
    });

    const trail = new THREE.Points(geo, mat);
    trail.name = 'cometTrail';
    trail.frustumCulled = false;

    const head = new THREE.Sprite(new THREE.SpriteMaterial({
      map, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false
    }));
    head.scale.set(2.6, 2.6, 1);

    const group = new THREE.Group();
    group.name = 'comet';
    group.visible = false;
    group.add(trail, head);
    this.world.add(group);

    this.comet = {
      group, trail, head, mat, pos,
      enabled: true,
      n: 0,        // samples written so far
      t: 0,        // 0..1 along the flight path
      dur: 2,
      fade: 0,     // 1 in flight, ramps to 0 while the tail dissolves
      from: new THREE.Vector3(),
      to: new THREE.Vector3(),
      ctrl: new THREE.Vector3(),
      at: new THREE.Vector3(),
      target: null
    };
  }

  setComet(o) {
    if (!this.comet) return;
    Object.assign(this.comet, o);
    if (!this.comet.enabled) {
      this.comet.group.visible = false;
      this.comet.fade = 0;
    }
  }

  // live position + radius for a focus id, shared by the camera and the comet
  _focusOf(id) {
    if (id === 'inti') return { pos: this.sun.position, size: 3 };
    const p = id ? this.planets.find(x => x.id === id) : null;
    return p ? { pos: p.group.position, size: p.size } : null;
  }

  _cometHop(prevId, id) {
    const c = this.comet;
    if (!c || !c.enabled || this.renderer.xr.isPresenting) return;
    const to = this._focusOf(id);
    if (!to) return;
    // leaving free flight, the light sets off from the core
    const from = this._focusOf(prevId) || this._focusOf('inti');

    c.from.copy(from.pos);
    c.to.copy(to.pos);
    c.target = to;

    const dir = c.to.clone().sub(c.from);
    const span = dir.length() || 1;
    dir.normalize();
    // bow the path sideways and up out of the orbital plane so it never hides
    // behind an orbit line; longer hops arc wider
    const side = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0));
    if (side.lengthSq() < 1e-4) side.set(1, 0, 0);
    side.normalize();
    c.ctrl.copy(c.from).add(c.to).multiplyScalar(0.5)
      .addScaledVector(side, span * 0.16)
      .addScaledVector(new THREE.Vector3(0, 1, 0), span * 0.12 + 1.5);

    c.t = 0;
    c.fade = 1;
    c.n = 0;
    // slow enough to follow by eye, and roughly paced with the camera move
    c.dur = clamp(span / 9, 1.9, 3.6);
    c.group.visible = true;
  }

  _updateComet(dt, t) {
    const c = this.comet;
    if (!c || !c.group.visible) return;
    if (!c.enabled) { c.group.visible = false; return; }

    if (c.t < 1) {
      // the destination keeps orbiting mid-flight, so re-read it every frame
      if (c.target) c.to.copy(c.target.pos);
      c.t = Math.min(1, c.t + dt / c.dur);
      const e = c.t * c.t * (3 - 2 * c.t);
      const u = 1 - e;
      c.at.set(0, 0, 0)
        .addScaledVector(c.from, u * u)
        .addScaledVector(c.ctrl, 2 * u * e)
        .addScaledVector(c.to, e * e);
    } else {
      // arrived: hold the head on target while the tail dissolves into the planet
      c.fade = Math.max(0, c.fade - dt / 0.9);
      if (c.fade <= 0) { c.group.visible = false; return; }
      if (c.target) c.at.copy(c.target.pos);
    }

    // newest sample goes in front, everything else shifts one slot down the tail
    const p = c.pos;
    if (c.n > 1) p.copyWithin(3, 0, (c.n - 1) * 3);
    p[0] = c.at.x; p[1] = c.at.y; p[2] = c.at.z;
    c.n = Math.min(COMET_TRAIL, c.n + 1);
    c.trail.geometry.setDrawRange(0, c.n);
    c.trail.geometry.attributes.position.needsUpdate = true;

    const vis = c.fade * clamp(c.t / 0.07, 0, 1);
    c.mat.uniforms.uSize.value = COMET_SIZE * this.world.scale.x;
    c.mat.uniforms.uFade.value = vis;
    c.head.position.copy(c.at);
    c.head.material.opacity = vis * 0.9;
    const pulse = 2.5 + Math.sin(t * 9) * 0.22;
    c.head.scale.set(pulse, pulse, 1);
  }

  /* ---------- mode meteor ---------- */

  // Every rock owns its trail material: the fade is per-meteor, so the uniform
  // can't be shared the way the comet's single tail can.
  _trailMat() {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        tGlow: { value: this.metGlow },
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

  _buildMeteors() {
    const group = new THREE.Group();
    group.name = 'meteors';
    group.visible = false;
    this.world.add(group);

    this.metGlow = glowTexture(64, [
      [0, 'rgba(255,255,255,1)'],
      [0.2, 'rgba(255,228,176,.95)'],
      [0.46, 'rgba(255,138,61,.5)'],
      [1, 'rgba(255,64,32,0)']
    ]);

    // beams live in scene space: one end is a controller or the camera, the
    // other a rock inside the (differently scaled) solar system group
    const beams = new THREE.Group();
    beams.name = 'meteorBeams';
    this.scene.add(beams);

    this.met = {
      group, beams,
      pool: [], hits: [], beamPool: [], bursts: [],
      on: false, over: false, firing: false, cool: 0, lock: null, shake: 0,
      health: MET_HEALTH, score: 0, kills: 0, wave: 1,
      gap: 2.6, maxAlive: 3, speed: 4.6, spawnT: 1.4
    };

    // in-headset readout: the DOM HUD can't follow you into VR
    const hud = new THREE.Mesh(
      new THREE.PlaneGeometry(0.44, 0.11),
      new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide, depthTest: false })
    );
    hud.name = 'meteorHud';
    hud.renderOrder = 998;
    hud.visible = false;
    this.scene.add(hud);
    this.metHud = hud;
  }

  _makeMeteor() {
    const M = this.met;
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
      map: this.metGlow, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false
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
    const mat = this._trailMat();
    const trail = new THREE.Points(geo, mat);
    trail.frustumCulled = false;

    [core, halo, hit, trail].forEach(o => { o.visible = false; M.group.add(o); });
    Object.assign(m, { core, halo, hit, trail, mat, pos });
    M.pool.push(m);
    M.hits.push(hit);
    return m;
  }

  _spawnMeteor() {
    const M = this.met;
    const m = M.pool.find(x => !x.alive) || this._makeMeteor();

    // planets take most of the fire; the core is the rarer, costlier target
    const pick = Math.random();
    m.target = pick < 0.24 ? 'inti' : PLANETS[Math.floor(Math.random() * PLANETS.length)].id;
    const to = this._focusOf(m.target);

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
    this.dispatchEvent(new CustomEvent('meteor-spawn', { detail: { target: m.target }, bubbles: true }));
  }

  _stepMeteor(m, dt, t, ws) {
    const to = this._focusOf(m.target);
    if (to) {
      this.tmp.copy(to.pos).sub(m.at);
      const d = this.tmp.length();
      if (d < to.size + m.r * 1.9) return this._meteorImpact(m, to);
      // mild homing: the target keeps orbiting, so the rock keeps correcting
      this.tmp.normalize().multiplyScalar(m.speed);
      m.vel.lerp(this.tmp, Math.min(1, dt * 0.85));
    }
    m.at.addScaledVector(m.vel, dt);
    if (m.at.length() > MET_SPAWN_R * 1.9) return this._retireMeteor(m);

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

  _retireMeteor(m) {
    m.alive = false;
    m.n = 0;
    m.trail.geometry.setDrawRange(0, 0);
    [m.core, m.halo, m.hit, m.trail].forEach(o => { o.visible = false; });
  }

  _meteorImpact(m, to) {
    const M = this.met;
    const dmg = m.target === 'inti' ? 18 : Math.round(7 + m.r * 16);
    M.health = Math.max(0, M.health - dmg);
    M.shake = Math.min(1.4, M.shake + 0.75);
    this._burst(m.at, 0xff6a2c, 34, 6.5, m.r * 3.6);
    const p = this.planets.find(x => x.id === m.target);
    if (p) p.mesh.userData.punch = 1;
    this._retireMeteor(m);
    this.dispatchEvent(new CustomEvent('meteor-hit', {
      detail: { id: m.target, damage: dmg, health: M.health }, bubbles: true
    }));
    this._meteorHud();
    if (M.health <= 0) this._meteorOver();
  }

  /* ---------- laser ---------- */

  _beam(from, to) {
    const M = this.met;
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
    const xr = this.renderer.xr.isPresenting;
    const rad = xr ? 0.0028 : 0.022;
    b.mesh.position.copy(from);
    b.mesh.lookAt(to);
    b.mesh.scale.set(rad, rad, from.distanceTo(to));
    b.mesh.visible = true;
    b.life = b.dur;
  }

  _muzzles() {
    const c = this.camera;
    // twin cannons slung below the viewport, so the bolts converge on the sight
    return [
      new THREE.Vector3(-1.15, -0.66, -1.7).applyMatrix4(c.matrixWorld),
      new THREE.Vector3(1.15, -0.66, -1.7).applyMatrix4(c.matrixWorld)
    ];
  }

  // screen aim: the crosshair is the barrel
  fireAt(ndc) {
    const M = this.met;
    if (!M.on || M.over || M.cool > 0) return;
    this.ray.setFromCamera(ndc || this.ndc, this.camera);
    this._fireRay(this.ray.ray.origin.clone(), this.ray.ray.direction.clone(), this._muzzles());
  }

  _fireFrom(source) {
    const M = this.met;
    if (!M.on || M.over || M.cool > 0) return;
    const o = new THREE.Vector3().setFromMatrixPosition(source.matrixWorld);
    const d = new THREE.Vector3(0, 0, -1).transformDirection(source.matrixWorld).normalize();
    this._fireRay(o, d, [o.clone()]);
  }

  _fireRay(origin, dir, muzzles) {
    const M = this.met;
    M.cool = MET_COOL;
    this.ray.set(origin, dir);
    const live = M.hits.filter(h => h.visible);
    const h = live.length ? this.ray.intersectObjects(live, false)[0] : null;
    const end = h ? h.point.clone() : origin.clone().addScaledVector(dir, 400);
    muzzles.forEach(mz => this._beam(mz, end));

    let killed = false;
    if (h) {
      const m = M.pool[h.object.userData.mid];
      if (m && m.alive) {
        killed = true;
        M.kills += 1;
        M.score += 10 + Math.round(m.r * 12);
        this._burst(m.at, 0xffd9a0, 38, 8, m.r * 3.8);
        this._retireMeteor(m);
        this._wave();
        this._meteorHud();
      }
    }
    this.dispatchEvent(new CustomEvent('meteor-shot', { detail: { hit: killed }, bubbles: true }));
  }

  /* ---------- debris ---------- */

  _burst(at, color, count, spread, size) {
    const M = this.met;
    let b = M.bursts.find(x => x.t >= x.dur);
    if (!b) {
      const n = 40;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
      const mat = new THREE.PointsMaterial({
        map: this.metGlow, size: 1, transparent: true, opacity: 1,
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

  /* ---------- game loop ---------- */

  _wave() {
    const M = this.met;
    const w = 1 + Math.floor(M.score / 120);
    if (w === M.wave) return;
    M.wave = w;
    // more rocks, arriving sooner and faster, the better you shoot
    M.gap = Math.max(0.4, 2.6 - (w - 1) * 0.22);
    M.maxAlive = Math.min(16, 2 + w);
    M.speed = 4.6 + (w - 1) * 0.55;
    this.dispatchEvent(new CustomEvent('meteor-wave', { detail: { wave: w }, bubbles: true }));
  }

  _meteorHud() {
    const M = this.met;
    this._metStamp = null;
    this.dispatchEvent(new CustomEvent('meteor-hud', {
      detail: { health: M.health, score: M.score, wave: M.wave, kills: M.kills, over: M.over }, bubbles: true
    }));
  }

  _meteorOver() {
    const M = this.met;
    if (M.over) return;
    M.over = true;
    M.firing = false;
    M.pool.forEach(m => { if (m.alive) this._retireMeteor(m); });
    this.dispatchEvent(new CustomEvent('meteor-over', {
      detail: { score: M.score, wave: M.wave, kills: M.kills }, bubbles: true
    }));
    // angka terakhir ikut disegarkan, termasuk papan kaca di dalam headset
    this._meteorHud();
  }

  _resetMeteorGame() {
    const M = this.met;
    M.pool.forEach(m => this._retireMeteor(m));
    M.beamPool.forEach(b => { b.life = 0; b.mesh.visible = false; });
    M.bursts.forEach(b => { b.t = b.dur; b.points.visible = false; });
    M.health = MET_HEALTH;
    M.score = 0; M.kills = 0; M.wave = 1;
    M.gap = 2.6; M.maxAlive = 3; M.speed = 4.6; M.spawnT = 1.4;
    M.over = false; M.firing = false; M.cool = 0; M.shake = 0; M.lock = null;
    this.planets.forEach(p => { p.mesh.userData.punch = 0; });
    this.dispatchEvent(new CustomEvent('meteor-aim', { detail: { locked: false }, bubbles: true }));
  }

  setMeteorMode(on) {
    const M = this.met;
    if (!M || M.on === !!on) return M && M.on;
    if (on && this.mode === 'ar') return false;   // AR stays display-only
    M.on = !!on;
    if (M.on) {
      this.closeArticle();
      this.freeFlight();
      this._resetMeteorGame();
      M.group.visible = true;
      this.moonPin = null;
      this.dist = clamp(this.dist, 54, 76);
      this.pitch = clamp(this.pitch, 0.1, 0.5);
      if (this.comet) this.setComet({ enabled: false });
      this.dispatchEvent(new CustomEvent('meteor-start', { bubbles: true }));
      this._meteorHud();
    } else {
      this._resetMeteorGame();
      M.group.visible = false;
      if (this.metHud) this.metHud.visible = false;
      this.dispatchEvent(new CustomEvent('meteor-end', { bubbles: true }));
    }
    if (this.renderer.xr.isPresenting) this._panelVisible(false);
    return M.on;
  }

  restartMeteor() {
    const M = this.met;
    if (!M || !M.on) return;
    this._resetMeteorGame();
    this.dispatchEvent(new CustomEvent('meteor-restart', { bubbles: true }));
    this._meteorHud();
  }

  _updateMeteors(dt, t) {
    const M = this.met;
    const ws = this.world.scale.x;

    if (!M.over) {
      M.spawnT -= dt;
      let alive = 0;
      M.pool.forEach(m => { if (m.alive) alive++; });
      if (M.spawnT <= 0 && alive < M.maxAlive) {
        this._spawnMeteor();
        M.spawnT = M.gap * (0.72 + Math.random() * 0.56);
      }
    }

    M.pool.forEach(m => { if (m.alive) this._stepMeteor(m, dt, t, ws); });

    M.cool = Math.max(0, M.cool - dt);
    // hold to keep firing, on screen only — in VR the trigger drives each bolt
    if (M.firing && !M.over && !this.renderer.xr.isPresenting) this.fireAt(this.ndc);

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

    if (this.renderer.xr.isPresenting) this._metHudFrame();
  }

  // canvas readout that rides in front of the viewer while playing in VR
  _metHudTexture() {
    const M = this.met;
    const c = makeCanvas(768, 192);
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
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  _metHudFrame() {
    const M = this.met;
    const hud = this.metHud;
    if (!hud) return;
    const stamp = M.health + '|' + M.score + '|' + M.wave + '|' + (M.over ? 1 : 0);
    if (this._metStamp !== stamp) {
      this._metStamp = stamp;
      if (hud.material.map) hud.material.map.dispose();
      hud.material.map = this._metHudTexture();
      hud.material.needsUpdate = true;
    }
    hud.visible = true;
    const cam = this.renderer.xr.getCamera ? this.renderer.xr.getCamera() : this.camera;
    cam.getWorldPosition(this.tmp);
    const a = this.xrHome.set ? this.xrHome.yaw : 0;
    hud.position.set(this.tmp.x + Math.sin(a) * 0.9, this.xrHome.y + 0.34, this.tmp.z - Math.cos(a) * 0.9);
    hud.rotation.set(0, a, 0);
  }

  /* ---------- navigation ---------- */

  travelTo(id) {
    if (!PANELS[id]) return;
    // meteor mode owns the camera: nothing navigates while rocks are inbound
    if (this.met && this.met.on) return;
    this.closeArticle();
    const prev = this.active;
    this.active = id;
    if (prev !== id) this._cometHop(prev, id);
    this.dockDist = id === 'inti' ? 6.2 : (id === 'insight' ? 8.6 : 7.2);
    if (this.renderer.xr.isPresenting) this._setPanel(id);
    this.navBtns.forEach(b => {
      if (b.userData.kind === 'nav') this._setBtn(b, b.userData.planetId === id ? 'active' : 'idle');
    });
    this.dispatchEvent(new CustomEvent('planet-focus', { detail: { id }, bubbles: true }));
  }

  freeFlight() {
    this.closeArticle();
    this.active = null;
    this._panelVisible(false);
    this.navBtns.forEach(b => { if (b.userData.kind === 'nav') this._setBtn(b, 'idle'); });
    this.dispatchEvent(new CustomEvent('planet-free', { bubbles: true }));
  }

  async enterAR() {
    if (!navigator.xr) throw new Error('WebXR tidak tersedia');
    this.setMeteorMode(false);
    const session = await navigator.xr.requestSession('immersive-ar', { optionalFeatures: ['local-floor'] });
    this.renderer.xr.setReferenceSpaceType('local');
    await this.renderer.xr.setSession(session);

    this.mode = 'ar';
    this.arPlaced = false;
    this.arError = null;

    // the WebGL layer must clear fully transparent so the camera feed shows through
    this._prevClearAlpha = this.renderer.getClearAlpha();
    this.scene.background = null;
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setClearAlpha(0);

    // display-only AR: park the system at a comfortable spot straight away
    // ('local' space starts at the device pose, so -z is roughly ahead),
    // then anchor it against the first tracked pose in _arFrame
    this.world.scale.setScalar(0.011);
    this.world.position.set(0, -0.25, -1.5);

    this.arOverlay = false;
    this.xrRoot.visible = false;
    this.gaze.visible = false;
    // the ambient clouds belong to the starfield backdrop, not to a real room
    this.stars.visible = false;
    this.dust.visible = false;
    this.scene.fog = null;
    this.planets.forEach(p => {
      p.tag.visible = true;
      // 0.09 is tuned for a black sky and vanishes against a lit room
      p.path.material.opacity = 0.55;
    });
    this.sunTag.visible = true;

    session.addEventListener('end', () => {
      this.dispatchEvent(new CustomEvent('xr-session-end', { detail: { mode: 'ar', placed: this.arPlaced }, bubbles: true }));
      this._exitXR();
    });
    this.dispatchEvent(new CustomEvent('ar-start', { detail: { overlay: false }, bubbles: true }));
    return session;
  }

  replaceAR() {
    this.arPlaced = false;
    this.freeFlight();
    this.dispatchEvent(new CustomEvent('ar-replace', { bubbles: true }));
  }

  _placeAR() {
    const p = this.arHit ? this.arHit.clone() : this.world.position.clone();
    this.world.position.copy(p);
    this.world.scale.setScalar(0.0135);
    this.arPlaced = true;
    this.arReticle.visible = false;
    this.dispatchEvent(new CustomEvent('ar-placed', { bubbles: true }));
  }

  _arFrame(frame) {
    // display-only AR: no taps, no UI — anchor the system once against the
    // first tracked pose, floating ahead of where the phone is looking
    if (!this.arPlaced && frame) {
      const ref = this.renderer.xr.getReferenceSpace();
      const pose = ref ? frame.getViewerPose(ref) : null;
      if (pose) {
        const cam = this.renderer.xr.getCamera ? this.renderer.xr.getCamera() : this.camera;
        cam.getWorldPosition(this.tmp);
        cam.getWorldDirection(this.tmp2);
        this.tmp2.y = 0;
        if (this.tmp2.lengthSq() < 1e-4) this.tmp2.set(0, 0, -1);
        this.tmp2.normalize();
        this.world.position.copy(this.tmp).addScaledVector(this.tmp2, 1.5);
        this.world.position.y = this.tmp.y - 0.25;
        this.arPlaced = true;
        this.dispatchEvent(new CustomEvent('ar-placed', { bubbles: true }));
      }
    }
    this.renderer.render(this.scene, this.camera);
  }

  async enterVR() {
    if (!navigator.xr) throw new Error('WebXR tidak tersedia');
    const session = await navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking'] });
    // 'local-floor' cuma diminta sebagai opsional, jadi tidak semua headset
    // memberikannya (Vision Pro salah satunya, tergantung versi). Kalau ruang
    // lantai ditolak, setSession three.js ikut gagal dan sesi mati sebelum
    // sempat menggambar — jadi tanyakan dulu, baru putuskan jenis ruangnya.
    let space = 'local-floor';
    try {
      await session.requestReferenceSpace('local-floor');
    } catch (e) {
      space = 'local';
    }
    this.xrFloor = space === 'local-floor';
    this.renderer.xr.setReferenceSpaceType(space);
    // kanvas halaman memang transparan, tapi di dalam headset latar itu harus
    // padat — kalau tidak, langitnya ikut kosong
    this._prevClearAlpha = this.renderer.getClearAlpha();
    this.renderer.setClearColor(INK, 1);
    await this.renderer.xr.setSession(session);
    this._bindXRControllers();
    this.mode = 'vr';
    this.xrRoot.visible = true;
    this.gaze.visible = true;
    this.hasController = false;
    this._resetDwell();
    this.dwell.lockUntil = performance.now() + 900;
    this.xrHome.set = false;
    this.planets.forEach(p => { p.tag.visible = true; });
    this.sunTag.visible = true;
    session.addEventListener('end', () => this._exitXR());
    return session;
  }

  _exitXR() {
    this.world.scale.setScalar(1);
    this.world.position.set(0, 0, 0);
    this.xrRoot.visible = false;
    this._panelVisible(false);
    if (this.metHud) this.metHud.visible = false;
    this.gaze.visible = false;
    this._resetDwell();
    this.mode = null;
    this.arPlaced = false;
    if (this.arReticle) this.arReticle.visible = false;
    if (this.arPrompt) this.arPrompt.visible = false;
    this._promptKind = null;
    this.world.position.set(0, 0, 0);
    this.hitStreak = 0;
    if (this.arBtns) this.arBtns.forEach(b => { b.visible = false; });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setClearAlpha(this._prevClearAlpha != null ? this._prevClearAlpha : 0);
    this.arOverlay = false;
    if (this.hitSource && this.hitSource.cancel) { try { this.hitSource.cancel(); } catch (e) {} }
    this.hitSource = null;
    this.stars.visible = true;
    this.dust.visible = true;
    this.scene.fog = this.baseFog;
    this.xrDock.scale.setScalar(1);
    this.xrPanel.scale.setScalar(1);
    this.planets.forEach(p => { p.tag.visible = false; });
    this.sunTag.visible = false;
    this._resize();
    this.dispatchEvent(new CustomEvent('xr-end', { bubbles: true }));
  }

  _hud(key, val) {
    const el = document.querySelector('[data-hud="' + key + '"]');
    if (el && el.textContent !== val) el.textContent = val;
  }

  _reserved() {
    const now = performance.now();
    if (this._resCache && now - this._resAt < 260) return this._resCache;
    const sel = '[data-ui="header"],[data-ui="flightplan"],[data-ui="readout"],[data-ui="xrline"],[data-ui="cursorpick"],[data-ui="hints"],[data-intro],[data-panel],[data-insight-panel]';
    const rects = [];
    document.querySelectorAll(sel).forEach(el => {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.08) return;
      const r = el.getBoundingClientRect();
      if (r.width > 4 && r.height > 4) rects.push(r);
    });
    this._resCache = rects;
    this._resAt = now;
    return rects;
  }

  _labels() {
    if (this.met && this.met.on) return;
    const w = this.clientWidth, h = this.clientHeight;
    const host = this.getBoundingClientRect();
    const reserved = this._reserved();
    const items = this.planets.concat([{ id: 'inti', group: this.sun }]);
    const placed = [];

    const rows = items.map(p => {
      const el = document.querySelector('[data-planet-label="' + p.id + '"]');
      if (!el) return null;
      p.group.getWorldPosition(this.tmp);
      const d = this.tmp.distanceTo(this.camera.position);
      this.tmp.project(this.camera);
      const behind = this.tmp.z > 1;
      const x = (this.tmp.x * 0.5 + 0.5) * w, y = (-this.tmp.y * 0.5 + 0.5) * h;
      return { p, el, d, x, y, behind };
    }).filter(Boolean);

    // nearest first, so a closer label always wins a contested spot
    rows.sort((a, b) => a.d - b.d);

    rows.forEach(row => {
      const { p, el, d, x, y, behind } = row;
      el.style.transform = 'translate(-50%, -50%) translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
      el.style.borderColor = this.active === p.id ? '#9E94F9' : (this.hover === p.id ? '#a99bf2' : 'rgba(243,242,248,.18)');

      const bwHalf = ((el.offsetWidth || 120) / 2) + 6;
      const bhHalf = ((el.offsetHeight || 30) / 2) + 4;
      const onScreen = !behind && x - bwHalf > 0 && x + bwHalf < w && y - bhHalf > 0 && y + bhHalf < h;
      if (!onScreen) {
        el.style.opacity = '0';
        el.style.pointerEvents = 'none';
        return;
      }

      // label box in viewport coordinates, with a small breathing margin
      const bw = (el.offsetWidth || 120) + 10, bh = (el.offsetHeight || 30) + 8;
      const box = { left: host.left + x - bw / 2, right: host.left + x + bw / 2, top: host.top + y - bh / 2, bottom: host.top + y + bh / 2 };
      const clash = r => box.left < r.right && r.left < box.right && box.top < r.bottom && r.top < box.bottom;

      const pinned = this.active === p.id || this.hover === p.id;
      const hidden = (!pinned && reserved.some(clash)) || placed.some(clash);
      if (hidden) {
        el.style.opacity = '0';
        el.style.pointerEvents = 'none';
        return;
      }

      placed.push(box);
      el.style.opacity = String(clamp(1.2 - d / 130, 0.25, 1));
      el.style.pointerEvents = 'auto';
    });
  }

  /* ---------- XR frame ---------- */

  _xrFrame() {
    const cam = this.renderer.xr.getCamera ? this.renderer.xr.getCamera() : this.camera;
    cam.getWorldPosition(this.tmp);
    cam.getWorldDirection(this.tmp2);
    const yaw = Math.atan2(-this.tmp2.x, -this.tmp2.z);
    if (!this.xrHome.set) { this.xrHome.yaw = yaw; this.xrHome.y = this.tmp.y; this.xrHome.set = true; }
    this.xrHome.yaw = lerp(this.xrHome.yaw, yaw, 0.012);
    this.xrHome.y = lerp(this.xrHome.y, this.tmp.y, 0.02);

    // di ruang lantai, 1,32 m adalah tinggi meja yang enak dipandang; tanpa
    // lantai, titik nol ada di kepala — jadi ukur turun dari mata sendiri
    this.world.scale.setScalar(0.03);
    this.world.position.set(0, this.xrFloor === false ? this.xrHome.y - 0.28 : 1.32, -1.5);

    const place = (obj, angle, radius, dy) => {
      const a = this.xrHome.yaw + angle;
      obj.position.set(this.tmp.x + Math.sin(a) * radius, this.xrHome.y + dy, this.tmp.z - Math.cos(a) * radius);
      obj.rotation.set(0, a, 0);
    };
    place(this.xrDock, -0.72, 0.72, 0.16);
    place(this.xrPanel, 0.66, 0.78, -0.02);

    const metOn = !!(this.met && this.met.on);
    this.sunTag.visible = !metOn;
    // meteor mode strips the dock down to its own exit button
    this.navBtns.forEach(b => {
      const k = b.userData.kind;
      if (k === 'nav' || k === 'free') b.visible = !metOn;
    });
    if (this.metBtn) {
      const label = metOn ? 'KELUAR MODE METEOR' : 'MODE METEOR';
      if (this.metBtn.userData.label !== label) {
        this.metBtn.userData.label = label;
        this._setBtn(this.metBtn, this.metBtn.userData.state, true);
      }
      this.metBtn.position.y = metOn ? -0.02 : -NAV.length * 0.066 - 0.094;
    }

    // controller pointing
    let hoverUI = null, hoverPlanet = null, ctrlActive = false;
    (this.controllers || []).forEach(c => {
      if (c.userData.connected === false) return;
      const hit = this._xrRay(c);
      const line = c.getObjectByName('ray');
      if (line) line.scale.z = hit ? Math.max(0.05, hit.distance) : 1.6;
      if (!hit) return;
      ctrlActive = true;
      if (hit.kind === 'ui') hoverUI = hit.obj;
      else hoverPlanet = hit.id;
    });

    if (metOn && !this.met.over) {
      // a held trigger keeps firing along the controller it is held on
      let armed = false;
      (this.controllers || []).forEach(c => {
        if (c.userData.connected === false || !c.userData.trigger) return;
        armed = true;
        this._fireFrom(c);
      });
      // Vision Pro cuma memunculkan penunjuk saat kamu mencubit, jadi patokannya
      // bukan "pernah ada controller" melainkan ada tidaknya penunjuk hidup
      // sekarang: begitu tak ada, reticle tatapan yang jadi pembidiknya
      const live = (this.controllers || []).some(c => c.userData.connected === true);
      if (!armed && !live && this.met.cool <= 0) {
        const o = new THREE.Vector3().setFromMatrixPosition(cam.matrixWorld);
        const d = new THREE.Vector3(0, 0, -1).transformDirection(cam.matrixWorld).normalize();
        this.ray.set(o, d);
        const live = this.met.hits.filter(h => h.visible);
        if (live.length && this.ray.intersectObjects(live, false)[0]) this._fireRay(o, d, [o.clone()]);
      }
    }

    // gaze + dwell — the fallback when nothing is being pointed at
    const now = performance.now();
    const dt = clamp((now - (this._lastXR || now)) / 1000, 0, 0.06);
    this._lastXR = now;
    const gazeOn = !ctrlActive && now > this.dwell.lockUntil;
    const gazeHit = gazeOn ? this._gazeHit(cam) : null;
    if (gazeHit) {
      if (gazeHit.key !== this.dwell.id) { this.dwell.id = gazeHit.key; this.dwell.t = 0; }
      else this.dwell.t += dt;
      const already = gazeHit.kind === 'planet' && gazeHit.id === this.active;
      if (already) { this.dwell.t = 0; this._setArc(0); }
      else {
        this._setArc(this.dwell.t / this.dwell.need);
        if (this.dwell.t >= this.dwell.need) {
          this._commitGaze(gazeHit);
          this._resetDwell();
          this.dwell.lockUntil = now + 700;
        }
      }
      if (gazeHit.kind === 'ui') hoverUI = hoverUI || gazeHit.obj;
      else hoverPlanet = hoverPlanet || gazeHit.id;
    } else {
      if (this.dwell.id) this._resetDwell();
    }
    const idle = !gazeHit;
    this.gazeDot.material.opacity = lerp(this.gazeDot.material.opacity, idle ? 0.55 : 1, 0.15);
    this.gazeRim.material.opacity = lerp(this.gazeRim.material.opacity, idle ? 0.2 : 0.55, 0.15);
    this.gazeArc.visible = !!gazeHit;

    // reticle sits a fixed distance ahead of the viewer
    this.gaze.position.copy(this.tmp.set(0, 0, -0.45).applyMatrix4(cam.matrixWorld));
    this.gaze.quaternion.copy(cam.quaternion);
    this.navBtns.forEach(b => {
      if (b === hoverUI) this._setBtn(b, 'hover');
      else if (b.userData.kind === 'nav') this._setBtn(b, b.userData.planetId === this.active ? 'active' : 'idle');
      else this._setBtn(b, 'idle');
    });
    this.hover = hoverPlanet;
    this.planets.forEach(p => {
      const target = this.active === p.id ? 1.5 : (this.hover === p.id ? 1.25 : 1);
      p.mesh.scale.setScalar(lerp(p.mesh.scale.x, target, 0.12));
      p.path.material.opacity = lerp(p.path.material.opacity, this.active === p.id || this.hover === p.id ? 0.42 : 0.09, 0.08);
      p.tag.visible = !metOn;
      p.tag.material.opacity = lerp(p.tag.material.opacity, this.hover === p.id || this.active === p.id ? 1 : 0.5, 0.1);
    });

    this.renderer.render(this.scene, this.camera);
  }

  /* ---------- main loop ---------- */

  _frame(frame) {
    try {
      this._frameBody(frame);
    } catch (err) {
      const msg = (err && err.message) ? err.message : String(err);
      if (this.arError !== msg) {
        this.arError = msg;
        if (this.arPrompt) {
          if (this.arPrompt.material.map) this.arPrompt.material.map.dispose();
          this.arPrompt.material.map = this._promptTexture('Galat: ' + msg);
          this.arPrompt.material.needsUpdate = true;
          this.arPrompt.visible = true;
          this._promptKind = 'error';
        }
        this.dispatchEvent(new CustomEvent('xr-error', { detail: { message: msg }, bubbles: true }));
      }
    }
  }

  _frameBody(frame) {
    const t = this.clock.getElapsedTime();
    // the clock's own delta is consumed by getElapsedTime, so track it here
    const dt = clamp(t - (this._lastT === undefined ? t - 0.016 : this._lastT), 0, 0.05);
    this._lastT = t;

    const hush = 1 - clamp((this.readDim || 0) * 1.25, 0, 1);
    this.planets.forEach(p => {
      const a = t * p.speed + p.phase;
      p.group.position.set(Math.cos(a) * p.orbit, Math.sin(a * 1.7) * p.orbit * 0.035, Math.sin(a) * p.orbit);
      p.mesh.rotation.y += 0.004;
      p.mesh.rotation.x += 0.0016;
      // the host planet keeps its moons, so shrink its body instead of the group
      if (p.id === 'insight') p.mesh.scale.setScalar(Math.max(hush, 0.001) * (p.mesh.userData.hoverScale || 1));
      else p.group.scale.setScalar(Math.max(hush, 0.001));
      if (hush < 0.999) p.path.material.opacity = p.path.material.opacity * hush;
    });
    this._updateMoons(t);
    this._updateRead(t, dt);
    this.sunCore.rotation.y = t * 0.05;
    this.sunWire.rotation.y = -t * 0.07;
    this.sunWire.rotation.x = Math.sin(t * 0.2) * 0.12;

    // breathing corona and gently twinkling particles
    const pulse = 1 + Math.sin(t * 1.4) * 0.045 + Math.sin(t * 3.1) * 0.02;
    this.sunGlow.scale.set(15 * pulse, 15 * pulse, 1);
    this.sunHaze.scale.set(30 * (2 - pulse), 30 * (2 - pulse), 1);
    // a corona tuned for a black sky reads as a white wash over a lit room
    const gain = this.mode === 'ar' ? 0.4 : 1;
    // reading falls into the moon's own night: the stage sphere carries its light
    // in its shader, so the rest of the system can go dark without losing it
    this.readDim = lerp(this.readDim, (this.read && this.read.slug) ? 1 : 0, 0.05);
    const dim = 1 - this.readDim * 0.84;
    if (this.sunLight) this.sunLight.intensity = 1200 * (1 - this.readDim * 0.82);
    if (this.sysLights) this.sysLights.forEach(([l, base]) => { l.intensity = base * (1 - this.readDim * 0.76); });
    this.sunGlow.material.opacity = (0.9 + Math.sin(t * 1.4) * 0.1) * gain * dim;
    this.sunHaze.material.opacity = gain * dim;
    this.sunCore.material.emissiveIntensity = (2.4 + Math.sin(t * 1.4) * 0.35) * (1 - this.readDim * 0.86);
    this.stars.material.opacity = (0.8 + Math.sin(t * 0.9) * 0.12 + Math.sin(t * 2.3) * 0.05) * (1 - this.readDim * 0.38);
    this.dust.material.opacity = (0.5 + Math.sin(t * 1.1 + 2) * 0.12) * (1 - this.readDim * 0.7);

    // shrink the sprites along with the system, otherwise each point keeps its
    // full-size footprint and the cloud blows out to a white smear in AR/VR
    const ws = this.world.scale.x;
    this.stars.material.size = STAR_SIZE * ws;
    this.dust.material.size = DUST_SIZE * ws;

    if (this.met && this.met.on) this._updateMeteors(dt, t);

    if (this.renderer.xr.isPresenting) {
      if (this.comet) this.comet.group.visible = false;
      return this.mode === 'ar' ? this._arFrame(frame) : this._xrFrame();
    }

    this._updateComet(dt, t);
    this._updateLaunch(dt);

    const met = !!(this.met && this.met.on);
    this.ray.setFromCamera(this.ndc, this.camera);
    let moonId = null;
    if (met) {
      // nothing on the page is hoverable now — the only thing the crosshair
      // reads is whether a rock sits under it, so the sight can lock on
      if (this.hover) { this.hover = null; this.dispatchEvent(new CustomEvent('planet-hover', { detail: { id: null }, bubbles: true })); }
      const live = this.met.hits.filter(h => h.visible);
      const lockHit = live.length ? this.ray.intersectObjects(live, false)[0] : null;
      const lock = lockHit ? lockHit.object.userData.mid : null;
      if (lock !== this.met.lock) {
        this.met.lock = lock;
        this.dispatchEvent(new CustomEvent('meteor-aim', { detail: { locked: lock !== null }, bubbles: true }));
      }
      this._cursor('none');
    } else {
      // once the moons are out, they take the pointer before the planet body does
      if (this.moonHits && this.moonReveal > MOON_LIVE) {
        const mh = this.ray.intersectObjects(this.moonHits, false)[0];
        if (mh) moonId = mh.object.userData.slug;
      }
      if (moonId !== this.hoverMoon) {
        this.hoverMoon = moonId;
        this.dispatchEvent(new CustomEvent('insight-hover', { detail: { slug: moonId }, bubbles: true }));
      }
      const hit = moonId ? null : this.ray.intersectObjects(this.hits, false)[0];
      const hoverId = hit ? hit.object.userData.planetId : null;
      if (hoverId !== this.hover) {
        this.hover = hoverId;
        this.dispatchEvent(new CustomEvent('planet-hover', { detail: { id: hoverId }, bubbles: true }));
      }
      this._cursor(hoverId || moonId ? 'pointer' : 'grab');
    }
    this.planets.forEach(p => {
      const target = this.hover === p.id ? 1.18 : 1;
      p.mesh.userData.hoverScale = lerp(p.mesh.userData.hoverScale || 1, target, 0.12);
      // a struck planet recoils, so a hit reads even with your eye elsewhere
      const punch = p.mesh.userData.punch = Math.max(0, (p.mesh.userData.punch || 0) - dt * 2.6);
      if (p.id !== 'insight') p.mesh.scale.setScalar(p.mesh.userData.hoverScale * (1 + punch * 0.5));
      p.path.material.opacity = lerp(p.path.material.opacity, this.active === p.id || this.hover === p.id ? 0.4 : 0.09, 0.08);
    });

    const focus = this.moonFocus ? this._moonFocus : (this.active ? this._focusOf(this.active) : null);

    if (focus) {
      const radial = this.tmp.copy(focus.out || focus.pos);
      if (radial.length() < 0.01) radial.set(0, 0, 1);
      radial.normalize();
      const off = focus.size * this.dockDist;
      const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
      const rx = radial.x * cy - radial.z * sy, rz = radial.x * sy + radial.z * cy;
      const reading = !!(this.read && this.read.slug);
      const wide = this.clientWidth >= 780;
      const lift = reading ? 0.12 + this.pitch * 0.3 : (this.active === 'insight' ? 0.22 : 0.35) + this.pitch * 0.5;
      this.desired.set(focus.pos.x + rx * off, focus.pos.y + off * lift, focus.pos.z + rz * off);
      // the reading column owns the right of the screen (the top, on a phone), so
      // aim off-target and let the moon settle into the space that is left
      const bx = reading ? (wide ? 0.62 : 0) : (wide && this.active === 'insight' ? 0.34 : 0);
      const by = reading ? (wide ? 0.1 : -0.34) : 0;
      if (bx || by) {
        this.tmp2.set(rz, 0, -rx).normalize().multiplyScalar(off * bx);
        this.tmp2.y += off * by;
        this.lookAt.lerp(this.tmp.copy(focus.pos).add(this.tmp2), this.warp ? 0.14 : 0.06);
      } else {
        this.lookAt.lerp(focus.pos, this.warp ? 0.14 : 0.06);
      }
    } else if (met) {
      // a turret, not a drifting orbit: the view only moves when you push the
      // crosshair against an edge, so the aim under it stays where you left it
      const ex = Math.abs(this.pointer.x) > 0.62 ? Math.sign(this.pointer.x) * (Math.abs(this.pointer.x) - 0.62) / 0.38 : 0;
      const ey = Math.abs(this.pointer.y) > 0.62 ? Math.sign(this.pointer.y) * (Math.abs(this.pointer.y) - 0.62) / 0.38 : 0;
      this.yaw += ex * dt * 1.2;
      this.pitch = clamp(this.pitch + ey * dt * 0.7, -0.35, 0.95);
      const d = this.dist;
      this.desired.set(Math.sin(this.yaw) * d * Math.cos(this.pitch), d * Math.sin(this.pitch) + 4, Math.cos(this.yaw) * d * Math.cos(this.pitch));
      this.lookAt.lerp(this.tmp.set(0, 0, 0), 0.1);
    } else {
      const yaw = this.yaw + t * 0.014;
      const d = this.dist;
      this.desired.set(Math.sin(yaw) * d * Math.cos(this.pitch), d * Math.sin(this.pitch) + 4, Math.cos(yaw) * d * Math.cos(this.pitch));
      this.lookAt.lerp(this.tmp.set(this.pointer.x * 2, this.pointer.y * -1.4, 0), 0.05);
    }

    this.prevPos.copy(this.camera.position);
    if (this.warp) {
      // the dive: a fast tween with a field-of-view punch, so arriving at a moon
      // feels like falling toward it rather than drifting into a dock
      this.warp.t = Math.min(1, this.warp.t + dt / this.warp.dur);
      this.camera.position.lerpVectors(this.warp.from, this.desired, 1 - Math.pow(1 - this.warp.t, 3));
      this.camera.fov = (this.baseFov || 52) + Math.sin(Math.min(1, this.warp.t / 0.86) * Math.PI) * 30;
      this.camera.updateProjectionMatrix();
      if (this.warp.t >= 1) {
        this.warp = null;
        this.camera.fov = this.baseFov || 52;
        this.camera.updateProjectionMatrix();
      }
    } else {
      this.camera.position.lerp(this.desired, focus ? 0.028 : 0.02);
    }
    if (met && this.met.shake > 0) {
      const k = this.met.shake * 0.5;
      this.camera.position.x += (Math.random() - 0.5) * k;
      this.camera.position.y += (Math.random() - 0.5) * k;
      this.camera.position.z += (Math.random() - 0.5) * k;
      this.met.shake = Math.max(0, this.met.shake - dt * 2.2);
    }
    this.camera.lookAt(this.lookAt);
    this.speed = lerp(this.speed, this.camera.position.distanceTo(this.prevPos) * 620, 0.15);

    this._labels();
    const distToTarget = focus ? this.camera.position.distanceTo(focus.pos) : this.camera.position.length();
    this._hud('speed', Math.round(this.speed).toString().padStart(3, '0'));
    this._hud('distance', (distToTarget * 1.4e3).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' km');
    this._hud('mode', met ? 'MODE METEOR' : (focus ? (distToTarget > focus.size * this.dockDist * 1.6 ? 'MENUJU TUJUAN' : (this.moonFocus ? 'MEMBACA ORBIT' : 'MENGORBIT')) : 'ORBIT BEBAS'));

    this._present();
  }
}

if (!customElements.get('solar-system')) customElements.define('solar-system', SolarSystem);

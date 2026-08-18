import * as THREE from 'https://unpkg.com/three@0.184.0/build/three.module.js';

const ACCENT = 0xff5c2b, MINT = 0x6fe3b8, PAPER = 0xede8dc, INK = 0x0b0910;
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

// Condensed content for the in-headset panels (the DOM panels keep the full version).
const PANELS = {
  inti: {
    no: '00', tag: 'Inti', accent: '#ff5c2b',
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
    no: '01', tag: 'Program', accent: '#6fe3b8',
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
    no: '02', tag: 'Karya', accent: '#ff5c2b',
    title: 'Karya member',
    lead: 'Proyek VR, AR, dan XR yang dibangun oleh member komunitas.',
    items: [
      { k: 'VR · Edukasi', t: 'Judul proyek', d: 'Deskripsi singkat dan nama member pembuatnya.' },
      { k: 'AR · Budaya', t: 'Judul proyek', d: 'Deskripsi singkat dan nama member pembuatnya.' },
      { k: 'XR · Industri', t: 'Judul proyek', d: 'Deskripsi singkat dan nama member pembuatnya.' }
    ]
  },
  event: {
    no: '03', tag: 'Event', accent: '#ede8dc',
    title: 'Event & meetup',
    lead: 'Jadwal terdekat komunitas.',
    items: [
      { k: 'Bulan ini', t: 'XR Meetup — demo malam', d: 'Jakarta · Terbuka' },
      { k: 'Segera', t: 'Workshop WebXR untuk pemula', d: 'Online · Kuota terbatas' },
      { k: 'Rencana', t: 'Open Build showcase day', d: 'Bandung · Menunggu tanggal' }
    ]
  },
  insight: {
    no: '04', tag: 'Insight', accent: '#6fe3b8',
    title: 'Insight',
    lead: 'Catatan, tutorial, dan obrolan dari member komunitas.',
    items: [
      { k: 'Tutorial', t: 'Judul artikel', d: 'Ringkasan satu sampai dua baris tentang isi tulisan.' },
      { k: 'Cerita member', t: 'Judul artikel', d: 'Ringkasan satu sampai dua baris tentang isi tulisan.' },
      { k: 'Industri', t: 'Judul artikel', d: 'Ringkasan satu sampai dua baris tentang isi tulisan.' }
    ]
  },
  tim: {
    no: '05', tag: 'Tim', accent: '#ede8dc',
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
    no: '06', tag: 'Gabung', accent: '#ff5c2b',
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
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: PAPER, size: 0.55, transparent: true, opacity: 0.75, sizeAttenuation: true }));
    stars.name = 'stars';
    world.add(stars);

    const dustPos = [];
    for (let i = 0; i < 900; i++) {
      const r = 8 + Math.random() * 34, th = Math.random() * Math.PI * 2;
      dustPos.push(Math.cos(th) * r, (Math.random() - 0.5) * 2.4, Math.sin(th) * r);
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.Float32BufferAttribute(dustPos, 3));
    world.add(new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: MINT, size: 0.16, transparent: true, opacity: 0.4 })));

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
    sun.add(new THREE.Mesh(new THREE.SphereGeometry(5.6, 32, 32), new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.05 })));
    sun.add(new THREE.PointLight(ACCENT, 900, 140));
    const sunHit = new THREE.Mesh(new THREE.SphereGeometry(4.6, 12, 12), new THREE.MeshBasicMaterial({ visible: false }));
    sunHit.userData.planetId = 'inti';
    sun.add(sunHit);
    world.add(sun);
    this.sun = sun;
    this.sunCore = sunCore;

    scene.add(new THREE.AmbientLight(0xffffff, 0.42));
    const rim = new THREE.DirectionalLight(MINT, 1.1); rim.position.set(-30, 22, -18); scene.add(rim);

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

    this._buildXRUI();
    this._bindInput();

    this._resize = () => {
      const w = this.clientWidth || innerWidth, h = this.clientHeight || innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      const portrait = h > w;
      camera.fov = portrait ? 66 : 52;
      if (portrait && !this._portraitDone) { this.dist = 74; this._portraitDone = true; }
      camera.updateProjectionMatrix();
    };
    this._resize();
    this._ro = new ResizeObserver(this._resize); this._ro.observe(this);

    this.clock = new THREE.Clock();
    renderer.setAnimationLoop(() => this._frame());

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => this._refreshTextures());
    }
    const announce = (ok, reason) => this.dispatchEvent(new CustomEvent('xr-support', { detail: { ok: !!ok, reason: reason || '' }, bubbles: true }));
    if (navigator.xr) {
      navigator.xr.isSessionSupported('immersive-vr')
        .then(ok => announce(ok))
        .catch(err => announce(false, (err && err.name === 'SecurityError') ? 'blocked' : 'error'));
    } else {
      announce(false, 'unsupported');
    }
    requestAnimationFrame(() => this.dispatchEvent(new CustomEvent('scene-ready', { bubbles: true })));
  }

  disconnectedCallback() {
    removeEventListener('keydown', this._keys);
    if (this.renderer) this.renderer.setAnimationLoop(null);
    if (this._ro) this._ro.disconnect();
  }

  /* ---------- textures ---------- */

  _tagTexture(text, color) {
    const c = makeCanvas(740, 185);
    const g = c.getContext('2d');
    const hex = '#' + new THREE.Color(color).getHexString();
    g.fillStyle = 'rgba(11,9,16,.72)';
    g.strokeStyle = 'rgba(237,232,220,.28)';
    g.lineWidth = 3;
    const r = 78;
    g.beginPath();
    g.moveTo(r, 8); g.lineTo(c.width - r, 8); g.quadraticCurveTo(c.width - 8, 8, c.width - 8, 92);
    g.quadraticCurveTo(c.width - 8, 177, c.width - r, 177); g.lineTo(r, 177);
    g.quadraticCurveTo(8, 177, 8, 92); g.quadraticCurveTo(8, 8, r, 8);
    g.closePath(); g.fill(); g.stroke();
    g.fillStyle = hex;
    g.beginPath(); g.arc(66, 93, 15, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ede8dc';
    g.font = "600 62px 'Bricolage Grotesque', system-ui, sans-serif";
    g.textBaseline = 'middle';
    g.fillText(text, 104, 97);
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 4;
    return t;
  }

  _buttonTexture(label, state) {
    const c = makeCanvas(680, 130);
    const g = c.getContext('2d');
    g.fillStyle = state === 'active' ? 'rgba(255,92,43,.22)' : (state === 'hover' ? 'rgba(111,227,184,.16)' : 'rgba(11,9,16,.8)');
    g.fillRect(0, 0, c.width, c.height);
    g.strokeStyle = state === 'active' ? '#ff5c2b' : (state === 'hover' ? '#6fe3b8' : 'rgba(237,232,220,.22)');
    g.lineWidth = 4;
    g.strokeRect(2, 2, c.width - 4, c.height - 4);
    g.fillStyle = '#ede8dc';
    g.font = "500 52px 'Instrument Sans', system-ui, sans-serif";
    g.textBaseline = 'middle';
    g.fillText(label, 34, 68);
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 4;
    return t;
  }

  _panelTexture(id) {
    const d = PANELS[id];
    const c = makeCanvas(940, 1180);
    const g = c.getContext('2d');
    g.fillStyle = 'rgba(11,9,16,.94)';
    g.fillRect(0, 0, c.width, c.height);
    g.strokeStyle = 'rgba(237,232,220,.2)';
    g.lineWidth = 5;
    g.strokeRect(3, 3, c.width - 6, c.height - 6);
    g.textBaseline = 'top';

    let y = 62;
    g.fillStyle = d.accent;
    g.font = "500 30px 'Instrument Sans', system-ui, sans-serif";
    g.fillText('PLANET ' + d.no + '  ·  ' + d.tag.toUpperCase(), 56, y);
    y += 62;

    g.fillStyle = '#ede8dc';
    g.font = "600 62px 'Bricolage Grotesque', system-ui, sans-serif";
    wrap(g, d.title, c.width - 112).forEach(l => { g.fillText(l, 56, y); y += 68; });
    y += 12;

    g.fillStyle = '#b6b0c0';
    g.font = "400 32px 'Instrument Sans', system-ui, sans-serif";
    wrap(g, d.lead, c.width - 112).forEach(l => { g.fillText(l, 56, y); y += 43; });
    y += 26;

    d.items.forEach(it => {
      g.strokeStyle = 'rgba(237,232,220,.14)';
      g.lineWidth = 2;
      g.beginPath(); g.moveTo(56, y); g.lineTo(c.width - 56, y); g.stroke();
      y += 26;
      g.fillStyle = d.accent;
      g.font = "500 26px 'Instrument Sans', system-ui, sans-serif";
      g.fillText(String(it.k).toUpperCase(), 56, y);
      y += 38;
      if (it.t) {
        g.fillStyle = '#ede8dc';
        g.font = "600 38px 'Bricolage Grotesque', system-ui, sans-serif";
        wrap(g, it.t, c.width - 112).forEach(l => { g.fillText(l, 56, y); y += 46; });
      }
      g.fillStyle = it.t ? '#8e8899' : '#ede8dc';
      g.font = (it.t ? "400 30px" : "400 34px") + " 'Instrument Sans', system-ui, sans-serif";
      wrap(g, it.d, c.width - 112).forEach(l => { g.fillText(l, 56, y); y += 41; });
      y += 24;
    });

    g.fillStyle = '#6c667a';
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
    this.xrPanel.visible = true;
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
      c.addEventListener('selectstart', () => { this._markController(); this._xrSelect(c); });
      c.addEventListener('squeezestart', () => { this._markController(); this.freeFlight(); });
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
    const ui = this.ray.intersectObjects(this.xrTargets, false)[0];
    const planet = this.ray.intersectObjects(this.hits, false)[0];
    if (ui && (!planet || ui.distance < planet.distance)) return { kind: 'ui', obj: ui.object, key: ui.object.name };
    if (planet) return { kind: 'planet', id: planet.object.userData.planetId, key: 'planet-' + planet.object.userData.planetId };
    return null;
  }

  _commitGaze(hit) {
    if (hit.kind === 'planet') return this.travelTo(hit.id);
    const u = hit.obj.userData;
    if (u.kind === 'nav') this.travelTo(u.planetId);
    else this.freeFlight();
  }

  _xrRay(source) {
    this.tmp.set(0, 0, 0).applyMatrix4(source.matrixWorld);
    this.tmp2.set(0, 0, -1).transformDirection(source.matrixWorld).normalize();
    this.ray.set(this.tmp, this.tmp2);
    const ui = this.ray.intersectObjects(this.xrTargets, false)[0];
    const planet = this.ray.intersectObjects(this.hits, false)[0];
    if (ui && (!planet || ui.distance < planet.distance)) return { kind: 'ui', obj: ui.object, distance: ui.distance };
    if (planet) return { kind: 'planet', id: planet.object.userData.planetId, distance: planet.distance };
    return null;
  }

  _xrSelect(source) {
    const hit = this._xrRay(source);
    if (!hit) return;
    if (hit.kind === 'planet') return this.travelTo(hit.id);
    const u = hit.obj.userData;
    if (u.kind === 'nav') this.travelTo(u.planetId);
    else this.freeFlight();
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
      this.touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      setNdc(e);
      down = true; moved = 0; lx = e.clientX; ly = e.clientY;
      canvas.setPointerCapture(e.pointerId);
      this._cursor('grabbing');
    });

    canvas.addEventListener('pointermove', e => {
      if (this.touches.has(e.pointerId)) this.touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      setNdc(e);
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
      this.touches.delete(e.pointerId);
      if (this.touches.size < 2) this._pinch = null;
      if (down && moved < 8) this._pick();
      down = false;
      this._cursor(this.hover ? 'pointer' : 'grab');
    };
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', e => { this.touches.delete(e.pointerId); this._pinch = null; down = false; });

    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      if (this.active) this.dockDist = clamp(this.dockDist + e.deltaY * 0.006, 3.4, 16);
      else this.dist = clamp(this.dist + e.deltaY * 0.03, 16, 110);
    }, { passive: false });

    this._keys = e => {
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
    this.ray.setFromCamera(this.ndc, this.camera);
    const hit = this.ray.intersectObjects(this.hits, false)[0];
    if (hit) this.travelTo(hit.object.userData.planetId);
  }

  /* ---------- navigation ---------- */

  travelTo(id) {
    if (!PANELS[id]) return;
    this.active = id;
    this.dockDist = id === 'inti' ? 6.2 : 7.2;
    if (this.renderer.xr.isPresenting) this._setPanel(id);
    this.navBtns.forEach(b => {
      if (b.userData.kind === 'nav') this._setBtn(b, b.userData.planetId === id ? 'active' : 'idle');
    });
    this.dispatchEvent(new CustomEvent('planet-focus', { detail: { id }, bubbles: true }));
  }

  freeFlight() {
    this.active = null;
    this.xrPanel.visible = false;
    this.navBtns.forEach(b => { if (b.userData.kind === 'nav') this._setBtn(b, 'idle'); });
    this.dispatchEvent(new CustomEvent('planet-free', { bubbles: true }));
  }

  async enterVR() {
    if (!navigator.xr) throw new Error('WebXR tidak tersedia');
    const session = await navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking'] });
    this.renderer.xr.setReferenceSpaceType('local-floor');
    await this.renderer.xr.setSession(session);
    this._bindXRControllers();
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
    this.xrPanel.visible = false;
    this.gaze.visible = false;
    this._resetDwell();
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
    const sel = '[data-ui="header"],[data-ui="flightplan"],[data-ui="readout"],[data-ui="xrline"],[data-ui="cursorpick"],[data-ui="hints"],[data-intro],[data-panel]';
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
      el.style.borderColor = this.active === p.id ? '#ff5c2b' : (this.hover === p.id ? '#6fe3b8' : 'rgba(237,232,220,.18)');

      const onScreen = !behind && x > -60 && x < w + 60 && y > -40 && y < h + 40;
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
    this.world.scale.setScalar(0.03);
    this.world.position.set(0, 1.32, -1.5);

    const cam = this.renderer.xr.getCamera ? this.renderer.xr.getCamera() : this.camera;
    cam.getWorldPosition(this.tmp);
    cam.getWorldDirection(this.tmp2);
    const yaw = Math.atan2(-this.tmp2.x, -this.tmp2.z);
    if (!this.xrHome.set) { this.xrHome.yaw = yaw; this.xrHome.y = this.tmp.y; this.xrHome.set = true; }
    this.xrHome.yaw = lerp(this.xrHome.yaw, yaw, 0.012);
    this.xrHome.y = lerp(this.xrHome.y, this.tmp.y, 0.02);

    const place = (obj, angle, radius, dy) => {
      const a = this.xrHome.yaw + angle;
      obj.position.set(this.tmp.x + Math.sin(a) * radius, this.xrHome.y + dy, this.tmp.z - Math.cos(a) * radius);
      obj.rotation.set(0, a, 0);
    };
    place(this.xrDock, -0.72, 0.72, 0.16);
    place(this.xrPanel, 0.66, 0.78, -0.02);

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
      p.tag.material.opacity = lerp(p.tag.material.opacity, this.hover === p.id || this.active === p.id ? 1 : 0.5, 0.1);
    });

    this.renderer.render(this.scene, this.camera);
  }

  /* ---------- main loop ---------- */

  _frame() {
    const t = this.clock.getElapsedTime();

    this.planets.forEach(p => {
      const a = t * p.speed + p.phase;
      p.group.position.set(Math.cos(a) * p.orbit, Math.sin(a * 1.7) * p.orbit * 0.035, Math.sin(a) * p.orbit);
      p.mesh.rotation.y += 0.004;
      p.mesh.rotation.x += 0.0016;
    });
    this.sunCore.rotation.y = t * 0.05;
    this.sunWire.rotation.y = -t * 0.07;
    this.sunWire.rotation.x = Math.sin(t * 0.2) * 0.12;

    if (this.renderer.xr.isPresenting) return this._xrFrame();

    this.ray.setFromCamera(this.ndc, this.camera);
    const hit = this.ray.intersectObjects(this.hits, false)[0];
    const hoverId = hit ? hit.object.userData.planetId : null;
    if (hoverId !== this.hover) {
      this.hover = hoverId;
      this._cursor(hoverId ? 'pointer' : 'grab');
      this.dispatchEvent(new CustomEvent('planet-hover', { detail: { id: hoverId }, bubbles: true }));
    }
    this.planets.forEach(p => {
      const target = this.hover === p.id ? 1.18 : 1;
      p.mesh.scale.setScalar(lerp(p.mesh.scale.x, target, 0.12));
      p.path.material.opacity = lerp(p.path.material.opacity, this.active === p.id || this.hover === p.id ? 0.4 : 0.09, 0.08);
    });

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

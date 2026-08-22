// Rasi bintang — lapisan cerita langit Nusantara.
//
// Sistem ini tidak tahu apa-apa soal planet, kursor, atau HUD. Ia hanya diberi
// dunia untuk menaruh bintang, dan sebuah bus untuk memberi tahu siapa pun yang
// peduli bahwa langitnya baru saja dihitung ulang.
import * as THREE from '../core/three.js';
import { clamp, lerp } from '../core/math.js';
import { ACCENT, MINT } from '../data/planets.js';

// Jakarta: langit yang dipakai selalu langit Indonesia, siapa pun yang membuka
// dan dari mana pun — itu justru intinya.
export const SKY_LAT = -6.2, SKY_LON = 106.85, SKY_R = 168;

// ── sistem koordinat langit ─────────────────────────────────────────────────
//
// Diekspor karena bukan cuma rasi bawaan yang perlu ditempatkan di langit:
// bintang komunitas (`community-sky.js`) harus memakai perhitungan yang persis
// sama, kalau tidak ia akan melayang di tempat yang berbeda dari rasi di
// sekitarnya.
//
// `lstDari` mengembalikan local sidereal time untuk Jakarta — itu yang membuat
// langitnya berputar mengikuti jam sungguhan, bukan diam menempel di layar.
export function lstDari(now = Date.now()) {
  const jd = now / 86400000 + 2440587.5;
  const d = jd - 2451545.0;
  let gmst = (18.697374558 + 24.06570982441908 * d) % 24;
  if (gmst < 0) gmst += 24;
  return (gmst + SKY_LON / 15 + 24) % 24;
}

const RAD = Math.PI / 180;

/** ra (jam) + dec (derajat) → arah satuan di ruang dunia. */
export function arahDari(ra, dec, now = Date.now()) {
  const lst = lstDari(now);
  const lat = SKY_LAT * RAD;
  const ha = ((lst - ra) * 15) * RAD;
  const de = dec * RAD;
  const sinAlt = Math.sin(de) * Math.sin(lat) + Math.cos(de) * Math.cos(lat) * Math.cos(ha);
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
  const az = Math.atan2(
    -Math.sin(ha) * Math.cos(de),
    Math.sin(de) * Math.cos(lat) - Math.cos(de) * Math.sin(lat) * Math.cos(ha)
  );
  return {
    dir: new THREE.Vector3(Math.cos(alt) * Math.sin(az), Math.sin(alt), Math.cos(alt) * Math.cos(az)).normalize(),
    alt: alt / RAD
  };
}

/**
 * Kebalikan `arahDari`: arah di ruang dunia → ra/dec.
 *
 * Dipakai saat pengunjung menaruh bintangnya sendiri — yang ia tunjuk adalah
 * satu titik di layar, dan yang perlu disimpan adalah koordinat langit yang
 * masih berarti besok pagi ketika langitnya sudah berputar.
 */
export function raDecDari(dir, now = Date.now()) {
  const v = dir.clone().normalize();
  const lat = SKY_LAT * RAD;
  const alt = Math.asin(Math.max(-1, Math.min(1, v.y)));
  const az = Math.atan2(v.x, v.z);

  const sinDec = Math.sin(alt) * Math.sin(lat) + Math.cos(alt) * Math.cos(lat) * Math.cos(az);
  const dec = Math.asin(Math.max(-1, Math.min(1, sinDec)));

  const cosDec = Math.cos(dec);
  // Tepat di kutub langit, ra tidak terdefinisi — semua nilai menunjuk titik
  // yang sama. Dikembalikan 0 daripada menghasilkan NaN.
  if (Math.abs(cosDec) < 1e-6) return { ra: 0, dec: dec / RAD };

  const sinHa = -Math.sin(az) * Math.cos(alt) / cosDec;
  const cosHa = (Math.sin(alt) - Math.sin(dec) * Math.sin(lat)) / (cosDec * Math.cos(lat));
  const ha = Math.atan2(sinHa, cosHa) / RAD / 15;

  let ra = (lstDari(now) - ha) % 24;
  if (ra < 0) ra += 24;
  return { ra, dec: dec / RAD };
}

const SKY = [
  {
    id: 'waluku', name: 'Waluku', note: 'Orion · penanda musim tanam',
    ra: 5.6, dec: 0, scale: 16,
    stars: [[-0.62, 1.02], [0.6, 1.06], [-0.2, 0.12], [0, 0], [0.2, -0.12], [-0.58, -0.98], [0.64, -1.0]],
    links: [[0, 2], [1, 4], [2, 3], [3, 4], [2, 5], [4, 6], [5, 6]]
  },
  {
    id: 'gubug', name: 'Gubug Penceng', note: 'Crux · penunjuk arah selatan',
    ra: 12.45, dec: -60, scale: 11,
    stars: [[0.04, 1], [-0.08, -1], [-0.78, 0.06], [0.8, -0.12], [0.42, -0.5]],
    links: [[0, 1], [2, 3]]
  },
  {
    id: 'kartika', name: 'Lintang Kartika', note: 'Pleiades · gugus tujuh bintang',
    ra: 3.79, dec: 24, scale: 7,
    stars: [[-0.5, 0.3], [-0.1, 0.62], [0.32, 0.4], [0.05, 0.08], [-0.36, -0.2], [0.45, -0.26], [-0.02, -0.56]],
    links: [[0, 1], [1, 2], [2, 3], [3, 0], [3, 4], [3, 5], [4, 6]]
  },
  {
    id: 'kalajengking', name: 'Kalajengking', note: 'Scorpius · ekor yang melengkung',
    ra: 16.8, dec: -30, scale: 15,
    stars: [[-0.9, 0.86], [-0.5, 0.7], [-0.16, 0.5], [0.02, 0.16], [0.1, -0.2], [0.34, -0.52], [0.68, -0.68], [0.94, -0.5], [0.86, -0.16]],
    links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8]]
  },
  {
    id: 'biduk', name: 'Biduk', note: 'Ursa Major · perahu di utara',
    ra: 11.6, dec: 56, scale: 13,
    stars: [[-1, 0.12], [-0.62, 0.3], [-0.24, 0.28], [0.06, 0.06], [0.42, 0.12], [0.6, -0.24], [0.16, -0.34]],
    links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3]]
  }
];

export function createSkyLore(ctx) {
  let S = null;

  function build() {
    const group = new THREE.Group();
    group.name = 'skyLore';
    group.visible = false;
    ctx.world.add(group);

    // Tiap rasi jadi kelompok sendiri supaya bisa diredupkan sendiri-sendiri:
    // yang sedang di bawah cakrawala Indonesia memang harus terlihat tenggelam.
    const items = SKY.map(c => {
      const g = new THREE.Group();
      const starPos = [], linePos = [];
      // pola digambar di bidang lokal z = -R, lalu kelompoknya yang diputar ke
      // arah langit — memperbarui posisi cukup mengganti rotasinya
      const pts = c.stars.map(([x, y]) => new THREE.Vector3(x * c.scale, y * c.scale, -SKY_R));
      pts.forEach(p => starPos.push(p.x, p.y, p.z));
      c.links.forEach(([a, b]) => linePos.push(pts[a].x, pts[a].y, pts[a].z, pts[b].x, pts[b].y, pts[b].z));

      const sgeo = new THREE.BufferGeometry();
      sgeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
      const stars = new THREE.Points(sgeo, new THREE.PointsMaterial({
        color: 0xfff4d8, size: 6.2, map: ctx.particleMap, transparent: true, opacity: 0,
        sizeAttenuation: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false
      }));

      const lgeo = new THREE.BufferGeometry();
      lgeo.setAttribute('position', new THREE.Float32BufferAttribute(linePos, 3));
      const lines = new THREE.LineSegments(lgeo, new THREE.LineBasicMaterial({
        color: MINT, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false
      }));

      const tag = new THREE.Sprite(new THREE.SpriteMaterial({
        map: loreTexture(c.name, c.note), transparent: true, opacity: 0, depthWrite: false, fog: false
      }));
      tag.position.set(0, -c.scale * 1.35 - 4, -SKY_R);
      tag.scale.set(46, 11.5, 1);

      g.add(stars, lines, tag);
      group.add(g);
      return { spec: c, g, stars, lines, tag, alt: 0, up: true };
    });

    // cakrawala: tanpa garis ini, "di bawah ufuk" tidak berarti apa-apa
    const ring = [];
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * Math.PI * 2;
      ring.push(new THREE.Vector3(Math.sin(a) * SKY_R, 0, Math.cos(a) * SKY_R));
    }
    const horizon = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(ring),
      new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0, depthWrite: false, fog: false })
    );
    group.add(horizon);

    const marks = [['U', 0], ['T', Math.PI / 2], ['S', Math.PI], ['B', -Math.PI / 2]].map(([txt, a]) => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: loreTexture(txt, ''), transparent: true, opacity: 0, depthWrite: false, fog: false
      }));
      sp.position.set(Math.sin(a) * SKY_R, 5, Math.cos(a) * SKY_R);
      sp.scale.set(26, 6.5, 1);
      group.add(sp);
      return sp;
    });

    S = { group, items, horizon, marks, on: false, fade: 0, at: 0, clock: '' };
    aim();
  }

  function loreTexture(name, note) {
    const c = ctx.makeCanvas(600, note ? 150 : 90);
    const g = c.getContext('2d');
    g.textAlign = 'center';
    g.fillStyle = '#f6f3ff';
    g.font = "500 46px 'Poppins', system-ui, sans-serif";
    g.fillText(name, 300, note ? 58 : 60);
    if (note) {
      g.fillStyle = 'rgba(169,155,242,.85)';
      g.font = "400 24px 'IBM Plex Mono', ui-monospace, monospace";
      g.fillText(note.toUpperCase(), 300, 100);
    }
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 4;
    return t;
  }

  // Rekening waktu bintang sederhana: cukup untuk menaruh rasi di tempat yang
  // benar-benar ditempatinya di atas Indonesia saat ini.
  function aim() {
    if (!S) return;
    const now = Date.now();
    S.at = now;
    const jd = now / 86400000 + 2440587.5;
    const d = jd - 2451545.0;
    let gmst = (18.697374558 + 24.06570982441908 * d) % 24;
    if (gmst < 0) gmst += 24;
    const lst = (gmst + SKY_LON / 15 + 24) % 24;
    const rad = Math.PI / 180, lat = SKY_LAT * rad;

    const wib = new Date(now + 7 * 3600000);
    S.clock = String(wib.getUTCHours()).padStart(2, '0') + '.' + String(wib.getUTCMinutes()).padStart(2, '0');

    const up = new THREE.Vector3(0, 1, 0);
    S.items.forEach(it => {
      const c = it.spec;
      const ha = ((lst - c.ra) * 15) * rad;
      const dec = c.dec * rad;
      const sinAlt = Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(ha);
      const alt = Math.asin(clamp(sinAlt, -1, 1));
      let az = Math.atan2(-Math.sin(ha) * Math.cos(dec), Math.sin(dec) * Math.cos(lat) - Math.cos(dec) * Math.sin(lat) * Math.cos(ha));
      // sedikit diangkat supaya rasi yang menempel ufuk tidak terpotong lantai
      const el = Math.max(alt, -0.32);
      const dir = new THREE.Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)).normalize();
      const right = new THREE.Vector3().crossVectors(up, dir);
      if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
      right.normalize();
      const top = new THREE.Vector3().crossVectors(dir, right).normalize();
      it.g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, top, dir.clone().negate()));
      it.alt = alt / rad;
      it.up = alt > 0;
    });
    ctx.bus.emit('sky-aim', report());
  }

  function report() {
    if (!S) return { clock: '', items: [] };
    return {
      clock: S.clock,
      on: S.on,
      items: S.items.map(it => ({ name: it.spec.name, note: it.spec.note, alt: Math.round(it.alt), up: it.up }))
    };
  }

  function toggle(on) {
    if (!S) return false;
    S.on = on === undefined ? !S.on : !!on;
    if (S.on) S.group.visible = true;
    ctx.bus.emit('sky-lore', { on: S.on });
    return S.on;
  }

  function update(t) {
    if (!S) return;
    S.fade = lerp(S.fade, S.on ? 1 : 0, 0.1);
    if (S.fade < 0.004) { S.group.visible = false; return; }
    S.group.visible = true;
    if (S.on && Date.now() - S.at > 60000) aim();   // langit ikut bergerak
    // denyut pelan supaya bintangnya terasa hidup, bukan stiker
    const pulse = 0.82 + Math.sin(t * 1.1) * 0.12 + Math.sin(t * 2.7) * 0.06;
    const ws = ctx.world.scale.x;
    S.items.forEach((it, i) => {
      // yang sudah tenggelam tetap digambar, tapi tinggal bayangan
      const k = it.up ? 1 : 0.14;
      it.stars.material.opacity = S.fade * pulse * k;
      it.stars.material.size = 6.2 * ws;
      it.lines.material.opacity = S.fade * 0.46 * k * (0.85 + Math.sin(t * 0.8 + i) * 0.15);
      // nama rasi yang tenggelam ikut tenggelam: kalau tidak, label-labelnya
      // menumpuk di pinggir bawah dan saling menutupi
      it.tag.material.opacity = S.fade * (it.up ? 0.9 : 0);
    });
    S.horizon.material.opacity = S.fade * 0.18;
    S.marks.forEach(m => { m.material.opacity = S.fade * 0.35; });
  }

  return {
    name: 'sky',
    build,
    update,
    toggle,
    report,
    get state() { return S; }
  };
}

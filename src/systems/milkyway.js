// Galaksi — piringan spiral yang mengelilingi tata surya.
//
// Versi pertama berkas ini adalah pita Bima Sakti yang melintang di langit,
// dilihat dari dalam. Itu salah membaca permintaan: yang diminta adalah
// galaksinya sendiri — gugusan partikel cahaya yang **mengorbit** tata surya,
// dengan matahari duduk sebagai intinya.
//
// Empat hal yang membuatnya terbaca sebagai galaksi, bukan sekadar taburan
// titik di atas cakram:
//
//   1. lengan logaritmik  — jarak antar lengan melebar ke luar, tidak seragam
//   2. jalur debu         — sisi dalam tiap lengan diredupkan, jadi ada garis
//                           gelap yang membelahnya; ini yang paling menjual
//   3. dua ukuran partikel — titik kecil yang tajam untuk bintang, dan segelintir
//                           titik lebar nyaris tak terlihat untuk kabutnya.
//                           Tanpa yang kedua, hasilnya cuma konfeti.
//   4. tonjolan inti      — bola pipih keemasan di sekitar matahari
//
// Perputarannya dihitung di dalam vertex shader, bukan di JavaScript. Empat
// puluh enam ribu titik yang diputar per bingkai di CPU akan membunuh ponsel;
// di GPU ongkosnya nol. Karena itu tiap partikel hanya menyimpan jari-jari dan
// sudut awalnya, lalu posisinya dirakit ulang tiap bingkai dari `uTime`.
import * as THREE from '../core/three.js';

// Ukurannya ditentukan oleh jangkauan kamera, bukan oleh selera. Kamera bergerak
// antara 16 dan 110 dari pusat; piringan yang jari-jarinya ratusan membuat
// penonton selalu berada *di dalamnya*, dan spiral yang dilihat dari dalam tidak
// pernah terlihat seperti spiral. Dengan tepi luar 94, menjauh sedikit saja
// sudah cukup untuk melihat bentuk lengannya utuh.
const R_IN = 13, R_OUT = 94;
const ARMS = 2;              // spiral berlengan dua, seperti rujukannya
// Yang menentukan bentuk bukan angka ini sendiri, melainkan hasil kalinya
// dengan ln(R_OUT/R_IN) — itulah total sapuan tiap lengan. Sekitar 3,5 radian
// (0,57 putaran) adalah yang terbaca sebagai spiral; lebih dari satu putaran
// dan lengannya menumpuk jadi cincin sepusat, persis seperti piringan hitam.
const WIND = 1.8;
const THICK = 1.5;           // tebal piringan di tepi dalam; melebar ke luar
// Kemiringan 68° bukan angka estetis melainkan hitungan: kamera bawaan hanya
// ~20° di atas bidang orbit, jadi piringan yang sebidang akan selalu terlihat
// menyamping. Dengan 68°, arah pandang bawaan hampir tegak lurus permukaan
// piringan — spiralnya terlihat dari muka, lalu berangsur menyamping saat
// kamera memutari tata surya. Justru itu yang membuatnya tidak membosankan.
const TILT = 68 * Math.PI / 180, SWING = 0;

const COARSE = matchMedia('(pointer: coarse)').matches;
// Titik yang besar-besar terlihat seperti taburan kerikil. Yang mengubahnya
// jadi *cahaya* adalah jumlah: banyak titik kecil yang saling tumpang tindih.
// Titik tidak punya segitiga dan semuanya satu draw call, jadi yang dibayar
// hanya memori buffer — murah, bahkan di ponsel.
const GRAINS = COARSE ? 30000 : 82000;
// Kabut inilah yang sebenarnya dibayar: satu partikel selebar 50 piksel menutup
// dua ribu kali lebih banyak piksel daripada bintang selebar satu. Diukur dengan
// EXT_disjoint_timer_query, satu bingkai sempat 18,8 ms tanpa batas ukuran.
// Jumlahnya ditekan dan kecerahannya dinaikkan sebagai gantinya — cahaya
// totalnya setara, ongkosnya tidak.
const HAZE = 0.28;           // bagian partikel yang jadi kabut, bukan bintang
const BULGE = 0.08;          // bagian partikel yang jadi tonjolan inti
const HOT = 0.012;           // simpul pembentuk bintang, jingga terang
const LOOSE = 0.3;           // partikel yang tidak ikut lengan mana pun
// Seberapa jauh ke luar warna keemasan inti masih bertahan. Di rujukannya cuma
// intinya yang emas; lengannya biru-putih.
const WARM = 0.12;

export function createMilkyWay(ctx) {
  let M = null;

  const rnd = (a, b) => a + Math.random() * (b - a);
  const smooth = (e, x) => { const t = Math.min(1, Math.max(0, x / e)); return t * t * (3 - 2 * t); };

  // Satu partikel menyimpan enam angka: jari-jari, sudut awal, tinggi, ukuran,
  // kecerahan, dan "nada" warnanya. Ukuran dan kecerahan sengaja dipisah —
  // sempat digabung jadi satu atribut, dan akibatnya partikel kabut tidak bisa
  // dibuat lebar tanpa sekalian menyilaukan.
  //
  // Semuanya ditentukan sekali saat dibangun; sesudah itu buffernya tidak
  // pernah disentuh lagi.
  function seed() {
    const aR = new Float32Array(GRAINS);
    const aA = new Float32Array(GRAINS);
    const aY = new Float32Array(GRAINS);
    const aS = new Float32Array(GRAINS);
    const aB = new Float32Array(GRAINS);
    const aT = new Float32Array(GRAINS);
    // three.js menolak geometri tanpa `position`; isinya tidak dipakai karena
    // posisi sebenarnya dirakit di dalam shader
    const pos = new Float32Array(GRAINS * 3);

    for (let i = 0; i < GRAINS; i++) {
      // --- tonjolan inti ---
      // Bola pipih keemasan yang menyelubungi matahari. Inilah yang membuat
      // matahari terbaca sebagai inti galaksinya, bukan sekadar bola yang
      // kebetulan ada di tengah.
      if (Math.random() < BULGE) {
        const b = Math.sqrt(Math.random());        // memadat ke tengah
        const r = 6 + 14 * b;
        const haze = Math.random() < 0.5;
        aR[i] = r;
        aA[i] = Math.random() * Math.PI * 2;
        aY[i] = (Math.random() + Math.random() - 1) * r * 0.45;
        aS[i] = haze ? rnd(6, 13) : rnd(0.45, 1.25);
        aB[i] = (haze ? rnd(0.16, 0.32) : rnd(0.24, 0.6)) * (1 - b * 0.5);
        aT[i] = Math.random() * 0.1;               // emas
        continue;
      }

      // Sebaran jari-jari dicondongkan ke dalam (pangkat 0,7): galaksi selalu
      // lebih padat di dekat inti, dan sebaran rata terlihat seperti cakram CD.
      const u = Math.pow(Math.random(), 0.7);
      const r = R_IN + (R_OUT - R_IN) * u;

      // Sepertiga partikel sengaja tidak ikut lengan mana pun. Tanpa mereka
      // ruang antar lengan kosong sempurna, dan hasilnya terlihat digambar
      // mesin, bukan awan bintang.
      const loose = Math.random() < LOOSE;

      // Lengan logaritmik: sudutnya tumbuh mengikuti ln(r).
      const arm = Math.floor(Math.random() * ARMS) * (Math.PI * 2 / ARMS);
      const ridge = arm + Math.log(r / R_IN) * WIND;
      // Lebar lengan melebar ke luar — lengan berlebar tetap terlihat kaku.
      const spread = 0.22 + u * 0.55;
      // dua undian dijumlahkan → menumpuk di punggung lengan, menipis ke tepi
      const off = (Math.random() + Math.random() - 1) * spread;

      // Piringan melebar ke luar, seperti aslinya.
      const flare = THICK * (0.5 + u * 1.9);

      // --- jalur debu ---
      // Debu menumpuk di sisi *dalam* lengan. Yang jatuh di pita sempit itu
      // diredupkan; bagian yang tidak bercahaya inilah yang membuat lengannya
      // terbaca sebagai lengan, bukan sebagai sapuan.
      const dusty = !loose && off > -0.45 * spread && off < -0.05 * spread;

      const haze = Math.random() < HAZE;
      // Simpul pembentuk bintang hanya masuk akal di paruh dalam piringan.
      const hot = !loose && !haze && u < 0.6 && Math.random() < HOT;

      let tone = u < WARM ? (u / WARM) * 0.45 : 0.45 + (u - WARM) / (1 - WARM) * 0.55;
      tone += (Math.random() - 0.5) * 0.14;
      if (hot) tone = -1;                          // di luar tangga warna biasa

      // Amplop kecerahan: tidak nol di tepi dalam — piringan harus menyambung
      // ke tonjolan, bukan berhenti sebagai gelang — naik sebentar, lalu
      // meredup ke luar.
      const env = (0.32 + 0.68 * smooth(0.12, u)) * (1 - 0.55 * u);

      aR[i] = r;
      aA[i] = loose ? Math.random() * Math.PI * 2 : ridge + off;
      aY[i] = (Math.random() + Math.random() + Math.random() - 1.5) * flare;
      aS[i] = haze ? rnd(4, 9) : (hot ? 1.3 : rnd(0.45, 1.0));
      aB[i] = (haze ? rnd(0.15, 0.30) : (hot ? 0.9 : rnd(0.24, 0.78))) * env * (dusty ? 0.4 : 1);
      aT[i] = tone;
    }
    return { aR, aA, aY, aS, aB, aT, pos };
  }

  function build() {
    const group = new THREE.Group();
    group.name = 'galaxy';
    group.rotation.set(TILT, SWING, 0);
    ctx.world.add(group);

    const s = seed();
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(s.pos, 3));
    geo.setAttribute('aR', new THREE.BufferAttribute(s.aR, 1));
    geo.setAttribute('aA', new THREE.BufferAttribute(s.aA, 1));
    geo.setAttribute('aY', new THREE.BufferAttribute(s.aY, 1));
    geo.setAttribute('aS', new THREE.BufferAttribute(s.aS, 1));
    geo.setAttribute('aB', new THREE.BufferAttribute(s.aB, 1));
    geo.setAttribute('aT', new THREE.BufferAttribute(s.aT, 1));

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        tGlow: { value: ctx.particleMap },
        uTime: { value: 0 },
        uSize: { value: 1 },
        // Batas ini yang sebenarnya menentukan ongkos, bukan jumlah partikel:
        // pada zoom terjauh seluruh piringan masuk layar sekaligus, dan dengan
        // batas 56 satu bingkai sempat 5,5 ms hanya untuk galaksi. Di 34 ia
        // turun ke sekitar 1 ms tanpa perubahan yang terlihat — kabutnya toh
        // lembut.
        uCap: { value: COARSE ? 24 : 34 },
        uFade: { value: 0 }
      },
      vertexShader: [
        'attribute float aR;',
        'attribute float aA;',
        'attribute float aY;',
        'attribute float aS;',
        'attribute float aB;',
        'attribute float aT;',
        'uniform float uTime;',
        'uniform float uSize;',
        'uniform float uCap;',
        'varying float vTone;',
        'varying float vDim;',
        'void main() {',
        // Rotasi diferensial, tapi tipis-tipis saja. Galaksi sungguhan memang
        // berputar lebih cepat di dalam, dan gradien yang jujur akan melintir
        // lengannya habis dalam hitungan menit — waktu kunjungan, bukan waktu
        // kosmik. Jadi bedanya dibuat kecil: cukup untuk terasa hidup, tidak
        // cukup untuk merusak bentuknya.
        '  float w = 0.018 + 0.09 / (30.0 + aR);',
        '  float a = aA + uTime * w;',
        '  vec3 p = vec3(cos(a) * aR, aY, sin(a) * aR);',
        '  vec4 mv = modelViewMatrix * vec4(p, 1.0);',
        // Ukuran titik tumbuh terbalik dengan jarak, dan partikel kabut yang
        // kebetulan lewat dekat kamera bisa membengkak sampai ribuan piksel.
        // Satu titik seperti itu saja sudah menutupi layar, dan ada belasan ribu
        // di antaranya — inilah cara paling gampang membuat ponsel tersedak.
        // Batasnya dipatok; kabutnya lembut, jadi berhenti membesar tidak
        // kelihatan.
        '  gl_PointSize = min(uSize * aS * (300.0 / max(-mv.z, 0.001)), uCap);',
        '  gl_Position = projectionMatrix * mv;',
        '  vTone = aT;',
        '  vDim = aB;',
        '}'
      ].join('\n'),
      fragmentShader: [
        'precision highp float;',
        'uniform sampler2D tGlow;',
        'uniform float uFade;',
        'varying float vTone;',
        'varying float vDim;',
        'void main() {',
        '  float a = texture2D(tGlow, gl_PointCoord).a * uFade * vDim;',
        '  vec3 warm = vec3(1.00, 0.84, 0.60);',   // inti
        '  vec3 pale = vec3(0.86, 0.86, 1.00);',   // pertengahan lengan
        '  vec3 cool = vec3(0.42, 0.50, 0.96);',   // tepi luar
        '  float t = clamp(vTone, 0.0, 1.0);',
        '  vec3 col = t < 0.45',
        '    ? mix(warm, pale, t / 0.45)',
        '    : mix(pale, cool, (t - 0.45) / 0.55);',
        // nada negatif menandai simpul panas, di luar tangga warna biasa
        '  if (vTone < 0.0) col = vec3(1.00, 0.58, 0.34);',
        '  gl_FragColor = vec4(col, 1.0) * a;',
        '}'
      ].join('\n')
    });

    const grains = new THREE.Points(geo, mat);
    grains.name = 'galaxyGrains';
    // Posisi titik dirakit di dalam shader, jadi kotak pembatas bawaan three.js
    // (semua titik di nol) berbohong — dan seluruh galaksi akan lenyap begitu
    // titik nol keluar layar.
    grains.frustumCulled = false;
    group.add(grains);

    // Mati secara bawaan: galaksinya menutupi hampir seluruh layar, dan yang
    // pertama harus terbaca saat halaman dibuka adalah tata suryanya sendiri.
    // Ini efek yang dinyalakan, bukan yang dimatikan.
    M = { group, grains, mat, on: false, fade: 0, gain: 1, hush: 1 };

    // Saat rasi bintang dinyalakan, garis-garisnyalah yang harus terbaca.
    ctx.bus.on('sky-lore', e => { if (M) M.hush = e.detail && e.detail.on ? 0.5 : 1; });
    // beri tahu antarmuka keadaan awalnya, supaya tombolnya tidak berbohong
    ctx.bus.emit('milkyway', { on: M.on });
  }

  function toggle(on) {
    if (!M) return false;
    M.on = on === undefined ? !M.on : !!on;
    ctx.bus.emit('milkyway', { on: M.on });
    return M.on;
  }

  // Dipanggil saat masuk/keluar sesi headset: titik additive sebanyak ini
  // dibayar dua kali di VR.
  function setGain(g) { if (M) M.gain = g; }

  function update(t) {
    if (!M) return;
    const want = M.on ? 1 : 0;
    M.fade += (want - M.fade) * 0.05;
    if (M.fade < 0.004) { M.group.visible = false; return; }
    M.group.visible = true;

    M.mat.uniforms.uTime.value = t;
    // ikut meredup saat artikel dibaca, seperti bintang dan debu
    const read = 1 - (ctx.view.readDim || 0) * 0.85;
    M.mat.uniforms.uFade.value = M.fade * M.gain * M.hush * read * 1.8;
    M.mat.uniforms.uSize.value = 2 * ctx.worldScale();
  }

  return { name: 'milkyway', build, update, toggle, setGain, get state() { return M; } };
}

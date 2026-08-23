// Langit komunitas — satu bintang per pengunjung.
//
// Rasi Nusantara di `sky-lore.js` adalah fakta astronomi: Waluku ada di sana
// entah situs ini dibuka atau tidak. Bintang di sini kebalikannya — ia ada
// karena seseorang menaruhnya, dan tetap di sana setelah orangnya pergi.
//
// Keduanya dipisah jadi dua sistem karena umur dan sumber datanya berbeda,
// tapi memakai sistem koordinat yang sama persis (`arahDari` dari sky-lore).
// Kalau tidak, bintang komunitas akan melayang di tempat yang tidak nyambung
// dengan rasi di sekitarnya begitu langitnya berputar.
import * as THREE from '../core/three.js';
import { lerp } from '../core/math.js';
import { SKY_R, arahDari, raDecDari } from './sky-lore.js';
import { API } from '../data/remote.js';

const WARNA = new THREE.Color('#ffe9c4');   // sedikit lebih hangat dari bintang rasi
const MAKS = 2000;                          // batas atas geometri, bukan batas fitur
const RAIH_PX = 24;                         // radius jangkauan penunjuk, dalam piksel layar
const UKURAN = 17;                          // piksel di layar; sizeAttenuation mati

/**
 * Bintang berkilau empat sudut, digambar di kanvas.
 *
 * Bukan cakram gradien seperti bintang latar dan rasi. Bedanya disengaja:
 * yang bulat adalah langit, yang berkilau adalah titipan orang. Satu pandang
 * sudah cukup membedakan mana yang ditaruh seseorang dan mana yang memang ada
 * di sana.
 *
 * Sudutnya dibuat cekung dengan menaruh titik kendali kurva tepat di pusat —
 * itu yang membuat lengannya meruncing, bukan jadi belah ketupat.
 */
function sparkleTexture(ctx, size = 128) {
  const c = ctx.makeCanvas(size, size);
  const g = c.getContext('2d');
  const m = size / 2;

  // Kabut bulat tipis di belakang: tanpa ini lengan bintangnya terlihat
  // mengambang, tidak menempel pada sumber cahaya.
  const kabut = g.createRadialGradient(m, m, 0, m, m, m);
  kabut.addColorStop(0, 'rgba(255,255,255,.42)');
  kabut.addColorStop(0.3, 'rgba(255,233,196,.13)');
  kabut.addColorStop(1, 'rgba(255,233,196,0)');
  g.fillStyle = kabut;
  g.fillRect(0, 0, size, size);

  const lengan = (panjang, alpha) => {
    const R = m * panjang;
    g.beginPath();
    g.moveTo(m, m - R);
    g.quadraticCurveTo(m, m, m + R, m);
    g.quadraticCurveTo(m, m, m, m + R);
    g.quadraticCurveTo(m, m, m - R, m);
    g.quadraticCurveTo(m, m, m, m - R);
    g.closePath();
    const isi = g.createRadialGradient(m, m, 0, m, m, R);
    isi.addColorStop(0, `rgba(255,255,255,${alpha})`);
    isi.addColorStop(0.34, `rgba(255,245,222,${alpha * 0.72})`);
    isi.addColorStop(1, 'rgba(255,233,196,0)');
    g.fillStyle = isi;
    g.fill();
  };

  // Salib panjang, lalu salib pendek yang diputar 45° — dua lapis membuat
  // kilaunya terbaca sebagai bintang, bukan sebagai tanda tambah.
  lengan(0.98, 0.95);
  g.save();
  g.translate(m, m);
  g.rotate(Math.PI / 4);
  g.translate(-m, -m);
  lengan(0.46, 0.55);
  g.restore();

  const inti = g.createRadialGradient(m, m, 0, m, m, m * 0.13);
  inti.addColorStop(0, 'rgba(255,255,255,1)');
  inti.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = inti;
  g.fillRect(0, 0, size, size);

  return new THREE.CanvasTexture(c);
}

// Fase kedip diturunkan dari id, bukan diacak: bintang yang sama berkedip pada
// irama yang sama tiap kali halaman dibuka, dan tidak ada yang perlu disimpan.
// Diacak per muat, langit akan terasa berbeda tiap kunjungan tanpa alasan.
const faseDari = (id = '') => ([...id].reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) % 6283, 7) / 1000);

// Dipakai berulang di `bintangDekat`; membuat Vector3 baru tiap bintang tiap
// frame berarti ribuan objek sekali pakai per detik.
const _v = new THREE.Vector3();

export function createCommunitySky(ctx) {
  let C = null;

  function build() {
    const group = new THREE.Group();
    group.name = 'community-sky';
    group.visible = false;
    ctx.world.add(group);

    // Satu objek Points untuk semua bintang. Seribu Sprite terpisah akan jadi
    // seribu draw call; satu buffer yang diperbarui jauh lebih murah, dan
    // jumlahnya memang bisa tumbuh tanpa batas jelas.
    const kilau = sparkleTexture(ctx, 128);
    // Sorotan tetap memakai cakram lembut: ia halo di belakang bintangnya,
    // bukan bintang kedua. `ctx.glowTexture` adalah pabrik, bukan tekstur jadi.
    const pijar = ctx.glowTexture(64, [
      [0, 'rgba(255,255,255,.95)'],
      [0.32, 'rgba(255,255,255,.42)'],
      [1, 'rgba(255,255,255,0)']
    ]);

    const posisi = new Float32Array(MAKS * 3);
    // Kedipan per bintang lewat warna simpul. PointsMaterial tidak punya alpha
    // per titik, tapi warna simpul dikalikan dengan warna material — dan di
    // atas AdditiveBlending, meredupkan warna sama saja dengan meredupkan
    // bintangnya. Itu menghindari ShaderMaterial sendiri untuk satu efek kecil.
    //
    // Sebelumnya satu nilai sinus dipakai untuk seluruh material, jadi semua
    // bintang berdenyut serempak — yang justru terbaca sebagai kedipan layar,
    // bukan kedipan bintang.
    const kerlip = new Float32Array(MAKS * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(posisi, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(kerlip, 3));
    geo.setDrawRange(0, 0);

    const titik = new THREE.Points(geo, new THREE.PointsMaterial({
      color: WARNA, size: UKURAN, sizeAttenuation: false, transparent: true, opacity: 0,
      map: kilau, vertexColors: true,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false
    }));
    group.add(titik);

    // Sorotan untuk bintang milik pengunjung ini — supaya ia bisa menemukannya
    // lagi di antara ratusan yang lain.
    const punyaku = new THREE.Sprite(new THREE.SpriteMaterial({
      map: pijar, color: new THREE.Color('#9E94F9'), transparent: true,
      opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false
    }));
    punyaku.scale.setScalar(14);
    punyaku.visible = false;
    group.add(punyaku);

    C = { group, titik, posisi, kerlip, punyaku, pijar, kilau, bintang: [], milikku: null, on: false, fade: 0 };
    muat();
  }

  async function muat() {
    try {
      const res = await fetch(`${API}/sky/stars`);
      if (!res.ok) return;
      C.bintang = (await res.json()).slice(0, MAKS);
      ctx.bus.emit('sky-stars', { count: C.bintang.length });
    } catch {
      // Langit bawaan tetap ada tanpa ini. Tidak perlu diberitahukan ke layar.
    }
  }

  // Dipanggil setelah pengunjung berhasil menaruh bintangnya: ditambahkan
  // langsung tanpa memuat ulang seluruh daftar, supaya bintangnya muncul
  // seketika di tempat yang ia tunjuk.
  function tambah(bintang, milikku = false) {
    if (!C || !bintang) return;
    // Daftar publik di-cache 120 detik di server dan di browser, jadi sebuah
    // bintang bisa saja sudah ikut terbawa daftar awal. Menambahkannya lagi
    // akan menggambar dua titik di tempat yang persis sama.
    if (C.bintang.some((b) => b.id === bintang.id)) {
      if (milikku) C.milikku = bintang;
      return;
    }
    C.bintang.push(bintang);
    if (milikku) C.milikku = bintang;
    ctx.bus.emit('sky-stars', { count: C.bintang.length });
  }

  function tandaiMilikku(bintang) {
    if (C) C.milikku = bintang;
  }

  /** Arah pandang (dari NDC) → koordinat langit yang bisa disimpan. */
  function koordinatDari(ndc) {
    ctx.ray.setFromCamera(ndc ?? ctx.pointer.ndc, ctx.camera);
    // Arah sinar sudah cukup: bola langit sangat jauh, jadi posisi kamera di
    // dalam tata surya tidak menggeser arah pandangnya secara berarti.
    return raDecDari(ctx.ray.ray.direction.clone());
  }

  function toggle(on) {
    if (!C) return false;
    C.on = on === undefined ? !C.on : !!on;
    if (C.on) C.group.visible = true;
    return C.on;
  }

  function count() { return C ? C.bintang.length : 0; }

  /**
   * Bintang yang paling dekat dengan arah penunjuk, atau null.
   *
   * Jaraknya diukur di **layar**, bukan di dunia. Bola langitnya berjari-jari
   * 168 satuan: ambang dalam satuan dunia akan terasa lebar saat kamera
   * menghadap ke satu arah dan sempit saat menghadap arah lain, karena sudut
   * pandang per satuan berubah. Ambang piksel terasa sama di mana pun.
   *
   * Posisinya dibaca dari buffer yang sudah diisi `update()` frame ini, jadi
   * tidak ada perhitungan langit yang diulang — cuma satu proyeksi per bintang.
   */
  function bintangDekat(ndc) {
    // Langit yang belum benar-benar terlihat tidak boleh bisa ditunjuk: kalau
    // tidak, bintang tak kasatmata akan mencuri kursor tepat setelah mode rasi
    // dimatikan.
    if (!C || !C.on || C.fade < 0.35) return null;
    const n = C.titik.geometry.drawRange.count;
    if (!n) return null;

    const kanvas = ctx.renderer.domElement;
    const ambangX = (RAIH_PX / kanvas.clientWidth) * 2;
    const ambangY = (RAIH_PX / kanvas.clientHeight) * 2;

    let paling = null;
    let terdekat = Infinity;
    for (let i = 0; i < n; i += 1) {
      _v.set(C.posisi[i * 3], C.posisi[i * 3 + 1], C.posisi[i * 3 + 2])
        .applyMatrix4(C.group.matrixWorld)
        .project(ctx.camera);
      if (_v.z > 1) continue;                       // di belakang kamera
      const dx = (_v.x - ndc.x) / ambangX;
      const dy = (_v.y - ndc.y) / ambangY;
      const d = dx * dx + dy * dy;
      if (d < 1 && d < terdekat) { terdekat = d; paling = C.bintang[i]; }
    }
    return paling;
  }

  // Arah bintang milik pengunjung ini, dihitung untuk saat ini juga — langitnya
  // berputar, jadi jawaban semenit lalu sudah bukan jawaban yang benar.
  function arahMilikku() {
    if (!C?.milikku) return null;
    return arahDari(C.milikku.ra, C.milikku.dec, Date.now()).dir;
  }

  function update(t) {
    if (!C) return;
    C.fade = lerp(C.fade, C.on ? 1 : 0, 0.07);
    if (C.fade < 0.01) { C.group.visible = false; return; }
    C.group.visible = true;

    // Posisi dihitung ulang tiap frame karena langitnya memang berputar
    // mengikuti waktu sungguhan. Untuk dua ribu titik ini masih jauh lebih
    // murah daripada satu draw call tambahan.
    const now = Date.now();
    let n = 0;
    for (const b of C.bintang) {
      const { dir } = arahDari(b.ra, b.dec, now);
      // Bintang yang tenggelam di bawah ufuk tetap digambar sedikit di atasnya,
      // sama seperti perlakuan rasi bawaan — supaya tidak terpotong lantai.
      const y = Math.max(dir.y, -0.3);
      posisiKe(n, dir.x * SKY_R, y * SKY_R, dir.z * SKY_R);

      // Dua sinus dengan periode yang tidak kelipatan satu sama lain: sekali
      // saja dan kedipannya terbaca sebagai denyut mesin, bukan sebagai udara
      // yang bergerak. Fase diambil dari id, jadi tetangga tidak sinkron.
      if (b.fase === undefined) b.fase = faseDari(b.id);
      const k = 0.62 + Math.sin(t * 1.15 + b.fase) * 0.26 + Math.sin(t * 2.7 + b.fase * 1.9) * 0.12;
      C.kerlip[n * 3] = k;
      C.kerlip[n * 3 + 1] = k;
      C.kerlip[n * 3 + 2] = k;

      n += 1;
      if (n >= MAKS) break;
    }
    C.titik.geometry.setDrawRange(0, n);
    C.titik.geometry.attributes.position.needsUpdate = true;
    C.titik.geometry.attributes.color.needsUpdate = true;

    // Kedipnya sekarang per bintang lewat warna simpul; yang tersisa di sini
    // hanya pemudaran satu langit saat mode rasi dinyalakan atau dimatikan.
    C.titik.material.opacity = C.fade;
    C.titik.material.size = UKURAN * ctx.worldScale();

    if (C.milikku) {
      const { dir } = arahDari(C.milikku.ra, C.milikku.dec, now);
      C.punyaku.position.set(dir.x * SKY_R, Math.max(dir.y, -0.3) * SKY_R, dir.z * SKY_R);
      C.punyaku.visible = true;
      C.punyaku.material.opacity = C.fade * (0.32 + Math.sin(t * 1.8) * 0.14);
    } else {
      C.punyaku.visible = false;
    }
  }

  function posisiKe(i, x, y, z) {
    C.posisi[i * 3] = x;
    C.posisi[i * 3 + 1] = y;
    C.posisi[i * 3 + 2] = z;
  }

  function dispose() {
    if (!C) return;
    C.titik.geometry.dispose();
    C.titik.material.dispose();
    C.punyaku.material.dispose();
    C.pijar.dispose();
    C.kilau.dispose();
    ctx.world.remove(C.group);
    C = null;
  }

  return {
    name: 'community-sky',
    build, update, dispose, toggle, count,
    koordinatDari, bintangDekat, tambah, tandaiMilikku, arahMilikku, muat,
    get daftar() { return C ? C.bintang : []; }
  };
}

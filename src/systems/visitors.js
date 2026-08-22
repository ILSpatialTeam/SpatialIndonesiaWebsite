// Pengunjung lain, sekarang.
//
// Tiap orang yang sedang membuka situs tampil sebagai satu titik cahaya kecil
// yang melayang di dekat planet yang sedang ia lihat. Saat ia berpindah, titik
// itu benar-benar terbang ke planet berikutnya lewat busur — bukan berpindah
// seketika.
//
// ── Yang sengaja TIDAK ada ─────────────────────────────────────────────────
//
// Tidak ada nama, tidak ada avatar, tidak ada obrolan, tidak ada kursor orang
// lain. Yang dibagikan cuma gerak. Itu cukup untuk membuat tata suryanya terasa
// dihuni, dan menutup seluruh permukaan moderasi sekaligus: tidak ada teks yang
// dikirim orang, jadi tidak ada yang perlu ditinjau siapa pun.
//
// Warnanya datang dari server, diturunkan dari id sesi — jadi konsisten selama
// orangnya masih ada, dan tidak ada yang perlu disimpan.
import * as THREE from '../core/three.js';
import { lerp } from '../core/math.js';
import { onLive, tamuLain, jumlahTamu } from '../data/live.js';

// Pengunjung tanpa planet (baru masuk, atau sedang di orbit bebas) melayang di
// cincin luar. Mereka tetap harus terlihat: itu bedanya "ada tiga orang di
// sini" dengan "sepi".
const R_LUAR = 44;
const TINGGI = 3.2;

export function createVisitors(ctx) {
  let V = null;

  // Satu tekstur dipakai bersama semua pengunjung. `ctx.glowTexture` adalah
  // pabrik, bukan tekstur jadi — dan memanggilnya sekali per pengunjung berarti
  // satu kanvas baru tiap orang yang masuk.
  let pijar = null;

  function build() {
    const group = new THREE.Group();
    group.name = 'visitors';
    ctx.world.add(group);
    pijar = ctx.glowTexture(64, [
      [0, 'rgba(255,255,255,.95)'],
      [0.3, 'rgba(255,255,255,.45)'],
      [1, 'rgba(255,255,255,0)']
    ]);
    V = { group, titik: new Map(), on: true, lepas: null };

    for (const v of tamuLain()) tambah(v);
    V.lepas = onLive((jenis, data) => {
      if (jenis === 'siap') { bersih(); for (const v of data.tamu) tambah(v); }
      else if (jenis === 'join') tambah(data);
      else if (jenis === 'move') pindah(data);
      else if (jenis === 'leave') buang(data.id);
      ctx.bus.emit('visitors', { count: jumlahTamu() });
    });
    ctx.bus.emit('visitors', { count: jumlahTamu() });
  }

  // Posisi tujuan seorang pengunjung. Planet yang sama dipakai banyak orang
  // sekaligus, jadi tiap orang diberi simpangan tetap dari id-nya — kalau
  // tidak, sepuluh titik akan bertumpuk persis dan terlihat seperti satu.
  function tujuan(v) {
    const sebar = [...v.id].reduce((n, c) => n + c.charCodeAt(0), 0);
    const sudut = (sebar % 360) * (Math.PI / 180);
    const jauh = 2.6 + (sebar % 7) * 0.42;

    const f = v.planet ? ctx.bodies.focusOf(v.planet) : null;
    if (!f) {
      return new THREE.Vector3(
        Math.cos(sudut) * R_LUAR, TINGGI + (sebar % 5) * 0.7, Math.sin(sudut) * R_LUAR
      );
    }
    return new THREE.Vector3(
      f.pos.x + Math.cos(sudut) * jauh,
      f.pos.y + TINGGI + (sebar % 4) * 0.5,
      f.pos.z + Math.sin(sudut) * jauh
    );
  }

  function tambah(v) {
    if (!V || V.titik.has(v.id)) return;
    const warna = new THREE.Color(v.warna || '#9E94F9');

    const inti = new THREE.Sprite(new THREE.SpriteMaterial({
      map: pijar, color: warna, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false
    }));
    inti.scale.setScalar(1.9);

    // Ekor: garis pendek yang mengikuti beberapa posisi terakhir. Cukup untuk
    // memberi arah gerak tanpa jadi jejak permanen — jejak permanen sudah
    // punya sistemnya sendiri.
    const EKOR = 14;
    const jejak = new Float32Array(EKOR * 3);
    const ekor = new THREE.Line(
      new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(jejak, 3)),
      new THREE.LineBasicMaterial({
        color: warna, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false, fog: false
      })
    );

    const awal = tujuan(v);
    inti.position.copy(awal);
    for (let i = 0; i < EKOR; i += 1) awal.toArray(jejak, i * 3);

    V.group.add(inti, ekor);
    V.titik.set(v.id, {
      v, inti, ekor, jejak, EKOR,
      target: awal.clone(),
      // Muncul perlahan, tidak berkedip masuk.
      masuk: 0,
      // Denyut diberi fase acak supaya sekelompok titik tidak berkedip serempak
      // seperti lampu hias.
      fase: (awal.x + awal.z) % 6.28
    });
  }

  function pindah(v) {
    const t = V?.titik.get(v.id);
    if (!t) return tambah(v);
    t.v = { ...t.v, ...v };
    t.target.copy(tujuan(t.v));
  }

  function buang(id) {
    const t = V?.titik.get(id);
    if (!t) return;
    // Ditandai untuk memudar, bukan langsung dihapus — orang yang menutup tab
    // tidak seharusnya lenyap begitu saja di depan mata orang lain.
    t.pergi = true;
  }

  function lepasTitik(id, t) {
    V.group.remove(t.inti, t.ekor);
    t.inti.material.dispose();
    t.ekor.geometry.dispose();
    t.ekor.material.dispose();
    V.titik.delete(id);
  }

  function bersih() {
    if (!V) return;
    for (const [id, t] of V.titik) lepasTitik(id, t);
  }

  function toggle(on) {
    if (!V) return false;
    V.on = on === undefined ? !V.on : !!on;
    V.group.visible = V.on;
    return V.on;
  }

  function update(t, dt) {
    if (!V || !V.on) return;

    for (const [id, p] of V.titik) {
      // Planet bergerak di orbitnya, jadi tujuannya dihitung ulang tiap frame —
      // pengunjung mengikuti planetnya, bukan mengejar titik mati di ruang.
      p.target.copy(tujuan(p.v));

      // Perpindahan antar planet jadi terasa karena titiknya butuh waktu
      // sampai. Nilai 0.045 kira-kira satu detik untuk menyeberangi tata surya.
      p.inti.position.lerp(p.target, 1 - Math.pow(1 - 0.045, dt * 60));

      p.masuk = lerp(p.masuk, p.pergi ? 0 : 1, 0.06);
      if (p.pergi && p.masuk < 0.02) { lepasTitik(id, p); continue; }

      const denyut = 0.82 + Math.sin(t * 1.6 + p.fase) * 0.18;
      p.inti.material.opacity = p.masuk * 0.85 * denyut;
      p.inti.scale.setScalar(1.5 + p.masuk * 0.7);

      // Ekor digeser satu langkah: posisi lama bergeser mundur, posisi baru
      // masuk di depan. Lebih murah daripada membangun ulang geometrinya.
      p.jejak.copyWithin(3, 0, (p.EKOR - 1) * 3);
      p.inti.position.toArray(p.jejak, 0);
      p.ekor.geometry.attributes.position.needsUpdate = true;
      p.ekor.material.opacity = p.masuk * 0.3;
    }
  }

  function dispose() {
    V?.lepas?.();
    bersih();
    if (V) ctx.world.remove(V.group);
    pijar?.dispose();
    pijar = null;
    V = null;
  }

  return { name: 'visitors', build, update, dispose, toggle, count: jumlahTamu };
}

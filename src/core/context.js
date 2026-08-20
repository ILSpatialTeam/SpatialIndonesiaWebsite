// Konteks: satu-satunya hal yang diterima sebuah sistem.
//
// Sengaja sempit. Sistem aurora tidak perlu tahu soal kursor, sistem meteor
// tidak perlu tahu soal bulan artikel. Yang dibagikan hanya barang bersama —
// panggung, kamera, dunia, dan jalan untuk berteriak (bus) — plus dua
// antarmuka kecil: `bodies` untuk menanyakan posisi planet, dan `pointer`
// untuk menanyakan arah bidikan.
//
// Kalau suatu sistem butuh sesuatu yang tidak ada di sini, itu pertanda ia
// sedang mengambil terlalu banyak tanggung jawab.
export function createContext(parts) {
  const ctx = {
    host: parts.host,
    bus: parts.bus,
    renderer: parts.renderer,
    scene: parts.scene,
    world: parts.world,
    camera: parts.camera,
    ray: parts.ray,
    pointer: parts.pointer,
    bodies: parts.bodies,
    view: parts.view,
    particleMap: parts.particleMap,
    glowTexture: parts.glowTexture,
    makeCanvas: parts.makeCanvas,
    isXR: () => parts.renderer.xr.isPresenting,
    worldScale: () => parts.world.scale.x
  };
  return ctx;
}

// Papan pengumuman.
//
// Sistem 3D tidak boleh tahu ada DOM, dan lapisan antarmuka tidak boleh tahu
// ada three.js. Keduanya hanya bicara lewat nama kejadian di sini, jadi salah
// satunya bisa diganti total tanpa menyentuh yang lain.
export function createBus(host) {
  return {
    emit(type, detail) {
      host.dispatchEvent(new CustomEvent(type, { detail, bubbles: true }));
    },
    on(type, fn) {
      document.addEventListener(type, fn);
      return () => document.removeEventListener(type, fn);
    }
  };
}

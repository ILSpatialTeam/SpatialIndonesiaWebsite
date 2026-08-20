// Daftar sistem.
//
// Sebuah sistem cukup punya tiga hal, dan ketiganya opsional:
//
//   { name, build(), update(t, dt), dispose() }
//
// Loop utama tidak pernah menyebut nama sistem mana pun — ia hanya memutar
// daftar ini. Menambah fitur berarti menambah satu berkas dan satu baris
// pendaftaran, bukan menyunting loop-nya (open/closed principle). Dan karena
// semua sistem berbentuk sama, urutannya bisa ditukar tanpa yang lain peduli.
export function createRegistry(ctx) {
  const list = [];
  const byName = new Map();

  return {
    add(factory) {
      const sys = factory(ctx);
      list.push(sys);
      if (sys.name) byName.set(sys.name, sys);
      return sys;
    },
    get(name) { return byName.get(name); },
    build() { list.forEach(s => s.build && s.build()); },
    update(t, dt) { list.forEach(s => s.update && s.update(t, dt)); },
    dispose() { list.forEach(s => s.dispose && s.dispose()); }
  };
}

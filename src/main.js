// Titik masuk tunggal.
//
// Urutannya disengaja dan penting: lapisan antarmuka dimuat lebih dulu supaya
// pendengarnya sudah terpasang, baru panggung didaftarkan. Elemen kustom
// diperbarui seketika saat `customElements.define` dipanggil — kalau panggung
// duluan, kejadian pertamanya (agenda, dukungan XR) terlanjur lewat sebelum
// ada yang mendengarkan. Bundel rilis membuat urutan itu terasa; dalam mode
// berkas terpisah ia tersamarkan oleh jeda jaringan.
import './ui/organisms/insight-reader.js';
import './ui/organisms/meteor-hud.js';
import './app/hud.js';
import './scene/solar-system.js';

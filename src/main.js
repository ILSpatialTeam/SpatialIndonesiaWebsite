// Titik masuk tunggal.
//
// Urutannya disengaja dan penting, sekarang dengan tiga lapis:
//
// 1. `data/remote.js` lebih dulu dari apa pun. Modul itu menerapkan snapshot
//    dari localStorage secara sinkron saat dievaluasi, dan evaluasi modul ES
//    berurutan — jadi begitu `solar-system.js` mulai dievaluasi, isi
//    `data/*` sudah yang terbaru. Kunjungan kedua tidak menunggu jaringan
//    sedetik pun sebelum bingkai pertama.
// 2. Lapisan antarmuka, supaya pendengarnya sudah terpasang.
// 3. Panggung terakhir. Elemen kustom diperbarui seketika saat
//    `customElements.define` dipanggil — kalau panggung duluan, kejadian
//    pertamanya (agenda, dukungan XR) terlanjur lewat sebelum ada yang
//    mendengarkan. Bundel rilis membuat urutan itu terasa; dalam mode berkas
//    terpisah ia tersamarkan oleh jeda jaringan.
import { segarkan, segarkanJejak, rekamKunjungan } from './data/remote.js';
import { mulaiLive } from './data/live.js';
import './ui/organisms/insight-reader.js';
import './ui/organisms/meteor-hud.js';
import './ui/organisms/panel-content.js';
import './ui/organisms/menu-labels.js';
import './app/hud.js';
import './app/seo.js';
import './scene/solar-system.js';

// Data terbaru diambil setelah semuanya berdiri, tidak ditunggu. Apa pun
// hasilnya — berhasil, 304, atau backend mati — tata suryanya sudah tampil.
segarkan();
segarkanJejak();

// Lintasan pengunjung ini dikumpulkan selama sesi dan dikirim sekali saat ia
// pergi — jejaknya lalu ikut menyala untuk pengunjung berikutnya.
rekamKunjungan();

// Presence live dibuka paling akhir. Koneksinya bertahan selama tab terbuka,
// dan tidak ada satu pun bagian situs yang menunggunya — kalau server tidak
// bisa dihubungi, tata suryanya tetap jalan tanpa pengunjung lain terlihat.
mulaiLive();

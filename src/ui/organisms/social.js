// Organisme: tautan kanal sosial.
//
// Duduk di pojok kiri bawah bersama tombol panduan, di dalam `.hud-corner`.
// Keduanya sengaja berbagi satu induk berposisi, bukan masing-masing menghitung
// `left`/`bottom` sendiri: sudut itu bergeser di ponsel (naik ke atas strip
// rencana penerbangan) dan hanya ada satu tempat yang perlu tahu ke mana.
//
// Bentuknya lingkaran bercincin seperti instrumen lain, tapi lebih kecil dan
// tanpa busur berputar — ia tautan keluar, bukan kendali. Yang membedakannya
// dari tombol di sebelahnya harus terlihat sebelum ditekan.
import { el } from '../atoms/el.js';
import { icon } from '../atoms/icon.js';

// Daftar yang sama juga ditulis sebagai `sameAs` di blok JSON-LD `index.html`.
// Duplikasinya disengaja: data terstruktur harus sudah ada di HTML yang dikirim
// server (perayap yang tidak menjalankan JavaScript tidak akan pernah melihat
// yang disuntik dari sini), sementara tautan yang bisa diklik hidup di lapisan
// HUD yang dibangun modul ini. Menambah kanal berarti menyentuh dua tempat —
// dan `index.html` adalah yang tidak boleh terlewat.
export const KANAL = [
  { key: 'instagram', name: 'Instagram', url: 'https://www.instagram.com/spatialindonesia/' },
  { key: 'linkedin', name: 'LinkedIn', url: 'https://www.linkedin.com/company/spatial-indonesia/' }
];

export const css = `/* Sudut kiri bawah: satu tempat berposisi, dua penghuni. Tombol panduan dulu
   memegang koordinat ini sendiri; sekarang ia ikut di sini supaya tautan sosial
   tidak perlu menebak selebar apa tetangganya di tiap breakpoint. */
/* 34px, bukan 30px. Kepala halaman, rencana penerbangan, dan pemilih kursor
   semuanya berdiri di 34px — sudut ini satu-satunya yang meleset empat piksel,
   warisan dari waktu .hud-info memegang koordinatnya sendiri. Empat piksel
   tidak terasa sampai ada elemen lain tepat di atasnya, dan di layar lebar
   pemilih kursor memang duduk persis di sana. */
.hud-corner { position: absolute; left: 34px; bottom: 26px; display: flex; align-items: center; gap: 12px; pointer-events: auto; }

/* Dinyatakan ulang di sini, bukan hanya di info-panel.js. Keduanya berkas
   terpisah yang diambil terpisah pula dalam mode berkas-lepas, dan satu salinan
   lama di cache peramban sudah cukup untuk menarik tombol panduan keluar dari
   baris ini — hasilnya tiga lingkaran yang berserakan diagonal, bukan sebaris.
   Aturan ini lebih spesifik, jadi ia menang atas versi mana pun yang termuat. */
.hud-corner > .hud-info { position: relative; left: auto; bottom: auto; }

/* Tautan, bukan kendali — dan itu harus terbaca sebelum ditekan. Tombol panduan
   di sebelahnya adalah instrumen: bercincin, berlatar, sebesar tombol lain.
   Kalau kanal sosial memakai bentuk yang sama persis, yang terlihat cuma tiga
   lingkaran seragam bermakna berbeda. Di sini keduanya jadi glif polos di balik
   garis pemisah tipis: satu kelompok, jelas bukan bagian dari instrumennya. */
.hud-social { display: flex; align-items: center; gap: 2px; padding-left: 12px; border-left: 1px solid rgba(243,242,248,.1); }

.hud-social a {
  position: relative; display: grid; place-items: center; width: 34px; height: 34px;
  border-radius: 50%; color: var(--hud-dim); text-decoration: none;
  transition: color .22s, background .22s;
}

.hud-social a svg { width: 18px; height: 18px; }

.hud-social a:hover { color: var(--hud-paper); background: rgba(158,148,249,.12); }

.hud-social a:focus-visible { outline: none; color: var(--hud-paper); box-shadow: 0 0 0 2px rgba(158,148,249,.5); }

/* Nama kanal muncul di atas glifnya saat disorot. Di layar sentuh ia tidak
   pernah tampil, dan di sanalah "aria-label" yang mengambil alih. */
.hud-social .cap {
  position: absolute; bottom: 38px; left: 50%; transform: translateX(-50%) translateY(4px);
  font-family: var(--hud-mono); font-size: 8.5px; letter-spacing: .18em; color: var(--hud-dim);
  white-space: nowrap; opacity: 0; transition: opacity .2s, transform .2s; pointer-events: none;
}

.hud-social a:hover .cap, .hud-social a:focus-visible .cap { opacity: 1; transform: translateX(-50%); }

@media (max-width: 779px) {
  /* Sudut yang sebenarnya, bukan mengambang 126px di atasnya.

     Angka 126px itu ruang yang dulu dipesan untuk strip rencana penerbangan di
     kaki layar; sejak strip itu tidak lagi tampil di ponsel, yang tersisa cuma
     tiga tombol menggantung di tengah-tengah tanpa alasan.

     Kiri 10px menyamai tepi kiri pil merek di kepala halaman, jadi keduanya
     berdiri di satu garis tegak.

     Bawahnya 46px, bukan menempel ke tepi: bingkai dekoratif template punya
     siku 22px di inset 16px, dan pada 18px siku itu memotong lingkaran tombol
     panduan tepat di tengah. 46px membuat barisnya berhenti 8px di atas ujung
     siku. Di layar lebar angkanya tetap 26px — di sana pemilih kursor duduk
     hanya 10px di atas baris ini, jadi menaikkannya justru menabrak sesuatu
     yang nyata demi menghindari yang dekoratif. */
  .hud-corner { left: 10px; bottom: calc(46px + env(safe-area-inset-bottom)); gap: 10px; }
  .hud-social { padding-left: 10px; gap: 4px; }
  /* Glifnya tetap 32px supaya sudut ini tidak menutupi tata suryanya, tapi
     sasaran sentuhnya dilebarkan jadi 44px lewat ::after transparan. Jarak
     antar-pusatnya 36px, jadi dua sasaran itu bertumpang 8px — dan di sanalah
     yang belakangan di DOM menang. Karena itu ::after-nya dipersempit
     horizontal: tinggi 44px penuh, lebar tepat sampai batas tetangganya. */
  .hud-social a { width: 32px; height: 32px; }
  .hud-social a svg { width: 17px; height: 17px; }
  .hud-social a::after { content: ""; position: absolute; left: 50%; top: 50%; width: 36px; height: 44px; transform: translate(-50%, -50%); }
  .hud-social .cap { display: none; }
}`;

export const node = el('div', { class: 'hud-social', 'data-hud-el': 'social' },
  KANAL.map(k => el('a', {
    href: k.url,
    // Tab baru, dan `noopener` bukan sekadar kebiasaan: tanpa itu halaman
    // tujuan memegang `window.opener` dan bisa mengarahkan ulang tab ini.
    target: '_blank', rel: 'noopener noreferrer',
    title: k.name, 'aria-label': 'Spatial Indonesia di ' + k.name
    // tanpa <span class="ring">: cincinnya milik instrumen, dan glif ini bukan
  }, [icon(k.key), el('span', { class: 'cap', text: k.name.toUpperCase() })]))
);

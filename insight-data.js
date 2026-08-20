// Konten planet Insight. Artikel = bulan yang mengorbit planet, sparing = satelit
// yang mengorbit bulan. Semua metadata di sini dipakai dua kali: sekali untuk
// teks yang dibaca, sekali untuk memilih orbit/warna/ukuran bulannya di scene.

export const CATEGORIES = {
  teknis: { label: 'Teknis', color: '#9E94F9' },
  desain: { label: 'Desain', color: '#a99bf2' },
  industri: { label: 'Industri', color: '#5ad1c0' },
  cerita: { label: 'Cerita member', color: '#f3f2f8' }
};

// Empat frekuensi sinyal. Memaksa orang memilih jenis kontribusinya sebelum
// menulis — supaya kolomnya tidak berubah jadi tumpukan "keren nih".
export const FREQ = {
  sinyal: {
    id: 'sinyal', label: 'Sinyal', glyph: '▲', color: '#9E94F9',
    hint: 'Menambah informasi, rujukan, atau data yang belum ada di tulisan.'
  },
  observasi: {
    id: 'observasi', label: 'Observasi', glyph: '◆', color: '#5ad1c0',
    hint: 'Pengalaman langsung atau studi kasus dari pekerjaanmu sendiri.'
  },
  sonde: {
    id: 'sonde', label: 'Sonde', glyph: '●', color: '#f3f2f8',
    hint: 'Pertanyaan untuk penulis atau untuk pembaca lain.'
  },
  anomali: {
    id: 'anomali', label: 'Anomali', glyph: '✦', color: '#f2a65a',
    hint: 'Sudut pandang berbeda atau sanggahan. Orbitnya sengaja dibuat miring.'
  }
};

export const ARTICLES = [
  {
    slug: 'frame-budget-vr',
    no: '001',
    cat: 'teknis',
    title: 'Kenapa 72 FPS Jadi Garis Hidup di VR',
    lead: 'Di layar biasa, frame drop bikin animasi tersendat. Di headset, frame drop bikin orang muntah. Ini isi anggaran 13,8 milidetik itu.',
    author: 'Tim Spatial Indonesia',
    date: '2026-07-28',
    read: 6,
    fresh: true,
    body: [
      {
        h: 'Anggaranmu 13,8 milidetik, bukan 16',
        p: [
          'Pada 72 Hz, satu frame harus selesai dalam 13,8 ms. Angka itu bukan target rata-rata, tapi plafon keras: satu frame saja lewat, headset akan menampilkan ulang frame lama, dan pengguna merasakannya sebagai sentakan di seluruh dunia — bukan hanya pada objek yang bergerak.',
          'Dan 13,8 ms itu belum sepenuhnya milikmu. Compositor, reprojection, dan pembacaan sensor sudah mengambil bagiannya lebih dulu. Anggap saja kamu punya sekitar 10 ms untuk logika, animasi, dan render dua mata sekaligus.'
        ]
      },
      {
        h: 'Yang bikin mual bukan grafis jelek',
        p: [
          'Motion sickness di VR hampir selalu berasal dari ketidakcocokan antara apa yang dilihat mata dan apa yang dirasakan telinga dalam. Frame yang telat memperbesar latensi gerak kepala, dan otak membaca itu sebagai racun.',
          'Konsekuensinya jelas dan sering diabaikan: menurunkan kualitas tekstur, mematikan bayangan real-time, atau menyederhanakan model selalu merupakan pilihan yang lebih baik daripada mempertahankan visual cantik pada 55 FPS. Karya yang indah tapi bikin pusing tidak akan ditonton sampai selesai.'
        ],
        q: 'Tidak ada satu pun keputusan artistik yang layak dibayar dengan frame rate.'
      },
      {
        h: 'Empat pembunuh frame yang paling sering ketemu',
        p: [
          'Pertama, draw call. Setiap material unik memaksa satu panggilan gambar, dan dua mata berarti hampir dua kali lipat. Gabungkan material, pakai atlas tekstur, dan gunakan instancing untuk objek berulang.',
          'Kedua, overdraw dari transparansi. Partikel, kabut, dan panel kaca yang saling menumpuk memaksa GPU menggambar piksel yang sama berkali-kali. Ini penyebab nomor satu yang tidak terlihat di profiler kalau kamu hanya melihat jumlah segitiga.',
          'Ketiga, alokasi memori per frame di dalam update loop. Garbage collector yang jalan di tengah sesi menghasilkan hitch yang persis terasa seperti sentakan. Buat pool, jangan buat objek baru tiap frame.',
          'Keempat, resolusi render yang tidak sesuai. Banyak orang lupa bahwa headset merender lebih besar dari resolusi panel untuk menutupi distorsi lensa. Turunkan render scale sedikit dan kamu sering mendapat 20% performa gratis tanpa ada yang menyadarinya.'
        ]
      },
      {
        h: 'Ukur dulu, jangan menebak',
        p: [
          'Sebelum mengoptimasi apa pun, tentukan dulu kamu terikat pada CPU atau GPU. Kalau menurunkan resolusi render tidak mengubah frame time, masalahmu ada di CPU dan mengecilkan tekstur tidak akan menolong sama sekali.',
          'Di WebXR, mulai dari `renderer.info` untuk jumlah draw call dan segitiga, lalu naik ke timer GPU lewat ekstensi disjoint timer query kalau tersedia. Di Quest, gunakan OVR Metrics Tool untuk melihat stale frame secara langsung di headset — angka itu jauh lebih jujur daripada FPS rata-rata.'
        ]
      },
      {
        h: 'Kalau tetap tidak cukup',
        p: [
          'Ada dua jalan keluar yang sah. Foveated rendering menurunkan resolusi di tepi pandangan, tempat mata memang tidak tajam, dan hampir selalu gratis secara persepsi. Fixed foveation level 2 adalah tombol pertama yang harus kamu tekan.',
          'Jalan kedua adalah mengurangi ambisi adegan. Ruang yang lebih kecil, jumlah objek yang lebih sedikit, dan pencahayaan yang di-bake sejak awal bukan tanda menyerah — itu keputusan desain yang sadar bahwa medianya punya batas fisik.'
        ]
      }
    ]
  },
  {
    slug: 'antarmuka-tanpa-sentuh',
    no: '002',
    cat: 'desain',
    title: 'Antarmuka yang Tidak Bisa Disentuh',
    lead: 'Semua kebiasaan desain layar patah begitu tombolnya melayang di udara. Catatan tentang zona nyaman, ukuran target, dan umpan balik tanpa permukaan.',
    author: 'Tim Spatial Indonesia',
    date: '2026-07-19',
    read: 7,
    fresh: true,
    body: [
      {
        h: 'Zona nyamannya jauh lebih sempit dari dugaanmu',
        p: [
          'Bidang pandang manusia memang lebar, tapi wilayah tempat orang bisa membaca dan menekan sesuatu tanpa memutar kepala jauh lebih kecil: kira-kira 60 derajat horizontal dan 40 derajat vertikal dari arah pandang netral.',
          'Untuk tangan, batasnya lebih ketat lagi. Apa pun yang menuntut lengan terangkat di atas bahu lebih dari beberapa detik akan menghasilkan gorilla arm. Letakkan kontrol utama setinggi dada, sedikit di bawah garis mata, dalam jarak 0,5 sampai 0,8 meter.'
        ]
      },
      {
        h: 'Fitts’ Law tetap berlaku, dengan ongkos tambahan',
        p: [
          'Waktu untuk menunjuk sesuatu tetap ditentukan oleh jarak dan ukuran target. Bedanya, di ruang tiga dimensi tanganmu tidak punya meja untuk bersandar, sehingga setiap gerakan membawa getaran alami.',
          'Aturan praktis yang bertahan: target interaktif minimal 2 derajat sudut pandang, idealnya 3. Pada jarak 1 meter itu berarti tombol selebar sekitar 3,5 sampai 5 cm. Beri jarak antar target minimal setengah lebar target — salah tekan di udara jauh lebih menjengkelkan daripada salah tap di ponsel.'
        ]
      },
      {
        h: 'Teks punya aturannya sendiri',
        p: [
          'Teks di headset dibatasi resolusi sudut, bukan ukuran piksel. Yang perlu kamu jaga adalah tinggi huruf dalam derajat: di bawah 0,4 derajat, teks mulai berpendar dan sulit dibaca meski panelnya besar.',
          'Praktik yang aman: tempatkan panel teks pada jarak tetap 1 sampai 2 meter, jangan lebih dekat dari 0,5 meter karena mata harus bekerja keras untuk konvergensi, dan hindari teks tipis. Berat huruf medium terbaca jauh lebih baik daripada light di semua headset yang ada sekarang.'
        ]
      },
      {
        h: 'Tanpa permukaan, umpan balik jadi wajib',
        p: [
          'Jari yang menekan tombol nyata mendapat perlawanan. Di udara, tidak ada apa-apa. Kalau kamu tidak menggantinya, orang akan menekan dua kali, ragu, lalu menyalahkan dirinya sendiri.',
          'Gantikan dengan tiga lapis sekaligus: perubahan visual saat pointer masuk area, getaran singkat 10 sampai 20 ms saat menekan, dan bunyi klik pendek. Ketiganya harus terjadi dalam 50 ms setelah aksi, atau hubungan sebab-akibatnya hilang.'
        ],
        q: 'Kalau pengguna menekan dua kali, itu bukan kesalahan mereka. Itu tanda umpan balikmu terlambat.'
      },
      {
        h: 'Daftar periksa singkat',
        p: [
          'Apakah semua kontrol utama terjangkau tanpa mengangkat lengan di atas bahu? Apakah target terkecilmu masih 2 derajat pada jarak terjauh yang mungkin? Apakah setiap aksi punya umpan balik visual, haptic, dan audio? Apakah teksmu terbaca oleh orang yang memakai kacamata di dalam headset?',
          'Kalau ada satu saja jawaban tidak, perbaiki itu sebelum menambah fitur baru. Antarmuka spatial jarang gagal karena kurang fitur; hampir selalu karena melelahkan dipakai lebih dari sepuluh menit.'
        ]
      }
    ]
  },
  {
    slug: 'webxr-jalan-tercepat',
    no: '003',
    cat: 'industri',
    title: 'WebXR: Jalan Tercepat Masuk Spatial dari Indonesia',
    lead: 'Hambatan terbesar bukan harga headset, tapi jarak antara karyamu dan orang yang mau melihatnya. Browser memangkas jarak itu jadi satu tautan.',
    author: 'Tim Spatial Indonesia',
    date: '2026-07-05',
    read: 5,
    fresh: false,
    body: [
      {
        h: 'Masalahnya distribusi, bukan perangkat',
        p: [
          'Membangun aplikasi VR native berarti meminta orang membuat akun toko, mengunduh beberapa ratus megabita, dan menunggu proses peninjauan sebelum karyamu bisa dilihat siapa pun. Untuk komunitas yang sedang tumbuh, itu tiga lapis gesekan yang mematikan momentum.',
          'WebXR memangkas semuanya jadi satu tautan yang bisa dikirim lewat WhatsApp. Orang membukanya di ponsel dan langsung mendapat versi AR; membukanya di headset dan langsung masuk mode imersif. Tidak ada pemasangan, tidak ada peninjauan.'
        ]
      },
      {
        h: 'Yang sudah bisa dilakukan hari ini',
        p: [
          'Sesi imersif VR dan AR, pelacakan enam derajat kebebasan, controller dan pelacakan tangan, hit test untuk menempatkan objek di lantai nyata, anchor, depth sensing di sebagian perangkat, dan light estimation. Untuk sebagian besar karya komunitas, ini sudah lebih dari cukup.',
          'Ekosistem pustakanya juga matang. three.js menangani WebXR dengan baik, dan bila kamu ingin lebih deklaratif ada beberapa lapisan di atasnya. Yang penting: kamu memakai keterampilan web yang sudah dimiliki banyak orang di Indonesia, bukan memulai dari nol.'
        ]
      },
      {
        h: 'Yang masih belum ada',
        p: [
          'Performa puncaknya tetap di bawah native, terutama untuk adegan besar dengan banyak material. Dukungan Safari di iOS masih tertinggal, sehingga jalur AR untuk pengguna iPhone biasanya lewat Quick Look dengan format USDZ, bukan WebXR.',
          'Akses ke fitur perangkat kelas atas — pelacakan mata penuh, passthrough kamera mentah — juga masih terbatas karena alasan privasi. Kalau karyamu bergantung pada itu, web belum jadi rumahnya.'
        ]
      },
      {
        h: 'Kenapa ini penting untuk kita',
        p: [
          'Sebagian besar calon pengguna karya spatial di Indonesia tidak punya headset dan tidak akan membelinya tahun ini. Tapi hampir semuanya punya ponsel Android yang mampu menjalankan AR di browser.',
          'Artinya, karya yang dibangun di web bisa dinikmati sekarang oleh guru, kurator museum, mahasiswa, dan calon klien — bukan hanya oleh sesama pemilik headset. Itu perbedaan antara komunitas yang berbicara ke dalam dan komunitas yang tumbuh.'
        ]
      }
    ]
  },
  {
    slug: 'occlusion-ar-palsu',
    no: '004',
    cat: 'teknis',
    title: 'Occlusion: Alasan AR-mu Terasa Palsu',
    lead: 'Objek virtual yang tetap terlihat saat berada di balik meja langsung mematahkan ilusi. Ini pilihan-pilihan yang kamu punya, dengan ongkosnya masing-masing.',
    author: 'Tim Spatial Indonesia',
    date: '2026-06-22',
    read: 8,
    fresh: false,
    body: [
      {
        h: 'Otak memeriksa oklusi lebih dulu',
        p: [
          'Dari semua isyarat kedalaman yang dipakai manusia — bayangan, perspektif, ukuran relatif, paralaks — oklusi adalah yang paling kuat dan paling cepat diproses. Kalau sebuah objek menutupi objek lain, otak menyimpulkan objek itu berada di depan. Tidak ada isyarat lain yang bisa mengalahkannya.',
          'Karena itu, model AR yang detail dan pencahayaannya sempurna tetap akan terasa seperti stiker kalau dia menembus kursi. Sebaliknya, model sederhana yang teroklusi dengan benar langsung terasa berada di ruangan.'
        ]
      },
      {
        h: 'Tiga cara mendapatkannya',
        p: [
          'Cara pertama, geometri proxy. Kamu membuat bentuk kasar untuk benda nyata — bidang lantai, kotak untuk meja — lalu merendernya hanya ke depth buffer tanpa warna. Murah, stabil, dan cocok untuk ruang yang kamu kendalikan seperti panggung pameran.',
          'Cara kedua, rekonstruksi mesh ruangan. Perangkat memindai lingkungan dan memberimu mesh yang bisa dipakai sebagai occluder. Akurat untuk benda besar dan diam, tapi butuh waktu pemindaian dan tidak mengikuti benda yang berpindah.',
          'Cara ketiga, depth map per frame dari sensor atau estimasi. Paling dinamis, satu-satunya yang bisa menangani tangan dan orang yang berjalan lewat.'
        ]
      },
      {
        h: 'Depth API dan batasnya',
        p: [
          'Peta kedalaman yang kamu terima biasanya jauh lebih kasar dari resolusi kamera, sering di kisaran 160 kali 90, dan datang dengan derau di tepi objek. Kalau dipakai mentah, siluet benda virtual akan bergetar setiap frame.',
          'Perbaikannya bukan menaikkan resolusi, tapi memperhalus keputusan: buat transisi lembut di sekitar ambang kedalaman alih-alih pemotongan keras, dan tapis nilai kedalaman antar frame supaya tidak melompat. Sedikit kabur di tepi jauh lebih tidak mengganggu daripada tepi yang berkedip.'
        ]
      },
      {
        h: 'Bayangan mengerjakan setengah sisanya',
        p: [
          'Setelah oklusi benar, hal berikutnya yang paling terasa adalah bayangan kontak — bayangan gelap kecil tepat di titik objek menyentuh permukaan. Tanpa itu, benda tampak melayang beberapa sentimeter di atas lantai.',
          'Bayangan kontak tidak perlu akurat secara fisika. Sebuah lingkaran gelap dengan tepi lembut, diskalakan menurut jarak objek ke permukaan, sudah menghasilkan sembilan puluh persen efeknya dengan ongkos yang hampir nol.'
        ]
      },
      {
        h: 'Kompromi yang layak diambil',
        p: [
          'Kalau perangkat targetmu tidak punya sensor kedalaman, jangan memaksakan estimasi berat yang memakan frame budget. Pilih pendekatan proxy, batasi area penempatan ke bidang datar yang terdeteksi, dan rancang adegan supaya benda virtual jarang berada di belakang benda nyata.',
          'Membatasi ruang masalah adalah teknik yang sah. Karya AR terbaik yang pernah saya lihat di lapangan bukan yang paling canggih secara teknis, tapi yang paling tahu di mana harus berhenti.'
        ]
      }
    ]
  },
  {
    slug: 'skala-borobudur-vr',
    no: '005',
    cat: 'cerita',
    title: 'Menjaga Skala: Catatan dari Membuat Candi di VR',
    lead: 'Modelnya sudah benar sejak awal. Yang salah adalah ukurannya — dan butuh tiga kali uji coba sebelum saya sadar itu bukan soal angka.',
    author: 'Member komunitas',
    date: '2026-06-08',
    read: 9,
    fresh: false,
    body: [
      {
        h: 'Kesalahan pertama: model tidak dalam meter',
        p: [
          'Saya menerima aset dari pemindaian fotogrametri dengan satuan yang tidak jelas. Di viewport semuanya terlihat masuk akal, jadi saya lanjut. Begitu masuk headset, stupa setinggi tiga meter terasa seperti mainan setinggi lutut.',
          'Pelajaran yang sekarang jadi kebiasaan: hal pertama yang saya lakukan pada aset baru adalah menaruh silinder setinggi 1,7 meter di sebelahnya. Kalau proporsinya salah, saya akan tahu dalam tiga detik, bukan tiga hari.'
        ]
      },
      {
        h: 'Manusia adalah satuan ukur',
        p: [
          'Di layar, skala itu relatif dan otak menerima apa saja. Di VR, tubuhmu jadi penggaris yang tidak bisa dibohongi. Tinggi mata, jangkauan tangan, dan lebar bahu semuanya ikut menilai.',
          'Sejak itu, setiap adegan yang saya bangun selalu punya satu benda referensi berukuran manusia yang terlihat sejak awal — anak tangga, pintu, pagar. Bukan untuk dekorasi, tapi untuk memberi mata titik jangkar.'
        ]
      },
      {
        h: 'Ketika ruang aslinya lebih besar dari ruang tamu',
        p: [
          'Kompleks candi ratusan meter tidak bisa dijelajahi dengan berjalan kaki di ruangan 3 kali 3 meter. Saya mencoba teleportasi, dan kehilangan seluruh rasa jarak — orang tiba di puncak tanpa merasa menempuh apa pun.',
          'Yang akhirnya berhasil adalah kombinasi: berjalan kaki nyata untuk area kecil yang penuh detail, ditambah perpindahan antar teras yang sengaja diberi jeda dan perubahan suara. Rasa "naik" ternyata lebih banyak dibawa oleh audio dan waktu tunggu daripada oleh jarak yang ditempuh.'
        ],
        q: 'Orang tidak mengingat berapa meter yang mereka tempuh. Mereka mengingat berapa lama rasanya.'
      },
      {
        h: 'Yang paling banyak berubah setelah uji coba',
        p: [
          'Kami menguji dengan dua belas orang, setengahnya belum pernah memakai headset. Tiga temuan mengubah desain secara mendasar: relief perlu diterangi lebih kuat dari yang realistis karena mata tidak punya waktu beradaptasi; teks penjelasan harus muncul menempel di dekat objek, bukan di panel melayang; dan hampir semua orang ingin menyentuh, meski tahu tidak bisa.',
          'Temuan ketiga itu yang paling mahal untuk ditangani, dan yang paling berdampak. Kami menambahkan pendar halus saat tangan mendekati relief. Tidak ada fungsi apa pun di baliknya, tapi rasa hadirnya melompat jauh.'
        ]
      },
      {
        h: 'Yang akan saya lakukan berbeda',
        p: [
          'Menetapkan satuan dan skala di hari pertama, sebelum satu tekstur pun dibuat. Menguji di headset setiap hari, bukan setiap milestone. Dan menganggarkan waktu untuk audio sejak awal, bukan menempelkannya di akhir sebagai pemanis.',
          'Kalau ada satu kalimat yang ingin saya titipkan ke siapa pun yang baru mulai: karya spatial tidak dinilai dari seberapa mirip, tapi dari seberapa yakin tubuhmu berada di sana.'
        ]
      }
    ]
  },
  {
    slug: 'spatial-anchor-catatan',
    no: '006',
    cat: 'teknis',
    title: 'Spatial Anchor: Catatan Awal',
    lead: 'Kenapa objek yang kamu letakkan di meja pelan-pelan bergeser, dan apa yang sebenarnya disimpan oleh sebuah anchor.',
    author: 'Tim Spatial Indonesia',
    date: '2026-04-14',
    read: 4,
    fresh: false,
    archived: true,
    body: [
      {
        h: 'Anchor bukan koordinat',
        p: [
          'Godaan pertama semua orang adalah menyimpan posisi objek sebagai tiga angka relatif terhadap titik awal sesi. Ini bekerja selama beberapa menit, lalu berhenti bekerja.',
          'Anchor adalah janji yang berbeda: kamu meminta sistem pelacakan untuk mengingat sebuah titik relatif terhadap ciri-ciri dunia nyata yang dia kenali. Saat pemahaman sistem tentang ruangan diperbarui, koordinat numeriknya boleh berubah — yang dijaga adalah hubungannya dengan dunia.'
        ]
      },
      {
        h: 'Kenapa objek bergeser',
        p: [
          'Pelacakan inside-out membangun peta ruangan sambil berjalan, dan peta itu terus dikoreksi. Ketika sistem menyadari bahwa dua bagian ruangan yang dia kira terpisah sebenarnya sama, seluruh peta digeser sedikit. Objek yang dipasang ke koordinat mentah akan ikut meleset; objek yang dipasang ke anchor ikut terkoreksi.',
          'Penyebab kedua yang lebih membosankan: permukaan tanpa tekstur. Meja putih polos dan dinding kosong memberi sedikit sekali ciri untuk dikenali. Pencahayaan yang berubah juga menurunkan kualitas pelacakan secara drastis.'
        ]
      },
      {
        h: 'Praktik yang menolong',
        p: [
          'Buat anchor per objek atau per kelompok kecil objek yang berdekatan, bukan satu anchor untuk seluruh adegan. Perbarui transform objek dari anchor setiap frame alih-alih menyalinnya sekali saat pembuatan.',
          'Dan yang paling sering dilupakan: beri pengguna cara untuk memperbaiki sendiri. Sebuah tombol kecil untuk memindahkan ulang objek menghemat lebih banyak keluhan daripada peningkatan akurasi pelacakan mana pun.'
        ]
      }
    ]
  }
];

// Sparing bawaan supaya cincinnya tidak kosong saat pertama dibuka.
export const SEED_SPARING = {
  'frame-budget-vr': [
    { id: 's1', anchor: [2, 1], freq: 'observasi', name: 'Rian', at: '2026-07-29', boost: 6,
      text: 'Kami kena persis di poin overdraw. Ada empat panel kaca semi transparan yang saling menumpuk di lobi, frame time langsung naik 4 ms padahal segitiganya sedikit. Diganti jadi satu panel dengan tekstur palsu, beres.' },
    { id: 's2', anchor: [4, 0], freq: 'sinyal', name: 'Dewi', at: '2026-07-30', boost: 4,
      text: 'Tambahan: di Quest, fixed foveated rendering level 2 hampir tidak terlihat kalau adeganmu tidak punya teks kecil di tepi pandangan. Kalau ada, turunkan ke level 1 karena huruf di pinggir jadi berbayang.' },
    { id: 's3', anchor: [1, 1], freq: 'anomali', name: 'Bagas', at: '2026-08-02', boost: 3,
      text: 'Saya kurang setuju kalau visual selalu boleh dikorbankan. Untuk karya seni atau arsip budaya, menurunkan kualitas sampai obyeknya kehilangan makna itu juga kegagalan. Kadang jawabannya adalah mengurangi luas adegan, bukan menurunkan kualitasnya.' },
    { id: 's4', anchor: [3, 1], freq: 'sonde', name: 'Nadia', at: '2026-08-05', boost: 1,
      text: 'Untuk WebXR, ada cara yang cukup andal untuk membaca stale frame dari dalam browser, atau tetap harus lewat tool bawaan headset?' }
  ],
  'antarmuka-tanpa-sentuh': [
    { id: 's5', anchor: [2, 1], freq: 'sinyal', name: 'Yoga', at: '2026-07-21', boost: 5,
      text: 'Soal jarak panel, 1,2 sampai 1,5 meter jadi titik manis di hampir semua tes yang kami lakukan. Di bawah 0,8 meter orang mulai mengeluh mata lelah setelah sepuluh menit, bahkan kalau teksnya besar.' },
    { id: 's6', anchor: [3, 1], freq: 'observasi', name: 'Sekar', at: '2026-07-24', boost: 2,
      text: 'Kami menambahkan getaran 15 ms saat pointer masuk area tombol, bukan hanya saat menekan. Tingkat salah tekan turun jauh, dan tidak ada yang menyadari kenapa. Umpan balik sebelum aksi ternyata sama pentingnya.' },
    { id: 's7', anchor: [1, 1], freq: 'sonde', name: 'Fajar', at: '2026-08-08', boost: 0,
      text: 'Bagaimana aturan ukuran target ini berubah kalau inputnya pelacakan tangan tanpa controller? Perasaan saya butuh lebih besar lagi.' }
  ],
  'webxr-jalan-tercepat': [
    { id: 's8', anchor: [0, 1], freq: 'anomali', name: 'Hendra', at: '2026-07-08', boost: 4,
      text: 'Argumen distribusinya kuat, tapi jangan meremehkan biaya performa. Untuk proyek klien dengan adegan besar, saya tetap memilih native dan memberi tautan web sebagai versi ringkas. Dua-duanya, bukan salah satu.' },
    { id: 's9', anchor: [3, 1], freq: 'observasi', name: 'Maya', at: '2026-07-12', boost: 3,
      text: 'Pengalaman di lapangan: dari 40 guru yang kami undang, 38 berhasil membuka tautan AR di ponsel mereka sendiri tanpa bantuan. Angka itu tidak akan pernah kami capai dengan aplikasi yang harus dipasang.' }
  ],
  'occlusion-ar-palsu': [
    { id: 's10', anchor: [3, 1], freq: 'sinyal', name: 'Arif', at: '2026-06-25', boost: 3,
      text: 'Poin bayangan kontak sering diremehkan. Kami memakai satu tekstur lingkaran blur yang diskalakan menurut tinggi objek, ongkosnya satu draw call, dan hasilnya lebih meyakinkan daripada bayangan real-time yang kami pakai sebelumnya.' },
    { id: 's11', anchor: [2, 1], freq: 'sonde', name: 'Tika', at: '2026-07-02', boost: 1,
      text: 'Untuk transisi lembut di ambang kedalaman, kira-kira berapa lebar yang masih terasa wajar? Kami mencoba beberapa nilai dan hasilnya selalu terlalu kabur atau tetap berkedip.' }
  ],
  'skala-borobudur-vr': [
    { id: 's12', anchor: [0, 1], freq: 'observasi', name: 'Putri', at: '2026-06-11', boost: 7,
      text: 'Silinder 1,7 meter itu trik yang sama yang kami pakai, dan saya heran kenapa tidak pernah masuk tutorial mana pun. Kami menyimpannya sebagai prefab dan menariknya ke setiap adegan baru sebelum apa pun yang lain.' },
    { id: 's13', anchor: [2, 1], freq: 'sinyal', name: 'Galih', at: '2026-06-19', boost: 2,
      text: 'Soal rasa naik yang dibawa audio: menambahkan gema yang berubah tiap teras membantu banyak. Ruang terbuka di atas terdengar berbeda dari lorong di bawah, dan tubuh langsung membacanya sebagai ketinggian.' }
  ],
  'spatial-anchor-catatan': [
    { id: 's14', anchor: [1, 1], freq: 'sinyal', name: 'Bimo', at: '2026-04-18', boost: 2,
      text: 'Tambahan kecil: kalau ruangannya punya dinding polos, tempelkan poster atau taruh benda bertekstur di beberapa titik sebelum sesi. Kedengaran bodoh, tapi kualitas pelacakan naik jelas.' }
  ]
};

# 💍 Wedding Invitation Management System (WIMS)

**Wedding Invitation Management System (WIMS)** adalah platform pengelolaan undangan pernikahan digital *all-in-one* berbasis web yang berjalan **100% gratis di ekosistem Google (Google Apps Script, Google Sheets, dan Google Drive)** tanpa memerlukan sewa server (VPS), hosting berbayar, maupun database eksternal.

Aplikasi ini dirancang untuk membantu pemilik acara pernikahan maupun penyelenggara acara (*Wedding Organizer*) dalam mengelola buku tamu digital, mempersonalisasi nama setiap tamu secara otomatis melalui tautan unik, mendistribusikan undangan via WhatsApp, menerima konfirmasi kehadiran (RSVP) & ucapan doa, hingga melakukan pemindaian **QR Code Check-in** di lokasi acara secara *real-time*.

---

## 🎯 Untuk Apa Aplikasi Ini Dibuat? (Fungsi Utama)

1. **Menggantikan Undangan Cetak & Manual yang Repot**
   Setiap tamu mendapatkan **link undangan digital pribadi** (`?token=...`) yang secara otomatis menampilkan nama tamu tersebut di sampul undangan tanpa perlu membuat file HTML satu per satu.
2. **Sentralisasi Database Tamu di Google Sheets**
   Seluruh data tamu, status pengiriman pesan WhatsApp, konfirmasi kehadiran (RSVP), jumlah tamu (*pax*), ucapan doa, hingga jam kehadiran di gedung (*Check-in*) tersimpan rapi dan otomatis di dalam 1 file Google Spreadsheet (8 Sheet terstruktur).
3. **Pengiriman Undangan WhatsApp Fleksibel (Mode Gratis & Mode Cloud API Resmi)**
   - **Mode 1-Klik WA Gratis (`wa.me`)**: Kirim undangan personal ke nomor WhatsApp tamu dengan 1 klik langsung dari dashboard tanpa biaya langganan API sepeser pun.
   - **Mode WhatsApp Business Cloud API Resmi (Meta)**: Mendukung pengiriman massal bertahap (*queueing system*) menggunakan *Time-driven Triggers* bagi pengguna yang memiliki akun Meta Cloud API.
4. **Kontrol Penuh Desain & Konten Tanpa Coding (*No-Code Editor*)**
   Pemilik acara dapat mengubah nama mempelai, jadwal akad/pemberkatan & resepsi, titik Google Maps, cerita perjalanan cinta (*Our Story*), galeri foto (terhubung langsung ke Google Drive), musik latar, serta **memilih 5 desain template undangan berbeda** langsung dari **Invitation Editor** lengkap dengan *Live Mobile Preview*.
5. **Sistem Penerima Tamu Modern dengan QR Code Check-in**
   Setiap undangan tamu dilengkapi *Personal Guest Pass* berupa QR Code unik. Petugas penerima tamu di gedung cukup membuka kamera HP dari dashboard untuk memindai QR tamu, mencatat jam kehadiran, dan mencegah *check-in* ganda.

---

## ✨ Dua Antarmuka Utama

### 1. 🖥️ Admin Dashboard (Desktop-First & Responsif)
Digunakan oleh pemilik acara / panitia untuk mengelola seluruh sistem:
- **Login Admin Berproteksi**: Autentikasi *single-owner* dengan *password hashing* (`SHA-256` + *unique salt*), sesi `CacheService`, dan proteksi *brute-force*.
- **Dashboard Overview**: 8 kartu metrik utama + 2 grafik interaktif (`Chart.js`) untuk memantau progres pengiriman undangan dan persentase kehadiran RSVP, daftar tamu terbaru, serta log aktivitas *real-time*.
- **Manajemen Data Tamu**: Tambah/edit/hapus tamu, validasi nomor WhatsApp Indonesia otomatis (`08xx` $\rightarrow$ `628xx`), deteksi nomor duplikat, **Import CSV**, **Import Excel (`.xlsx`/`.xls`) via konversi Google Drive**, Export CSV, filter multi-kriteria, pencarian cepat, dan *bulk delete*.
- **Invitation Editor & 5 Pilihan Desain Template**: Ubah seluruh isi undangan dan ganti desain template secara instan dengan pratinjau layar HP langsung (*Live Mobile Preview*).
- **WhatsApp Message Management**: Editor template pesan dengan variabel dinamis (`{{nama_tamu}}`, `{{link_undangan}}`, `{{nama_pasangan}}`, `{{tanggal_acara}}`, `{{lokasi_acara}}`), antrean pengiriman, *retry* pesan gagal, dan tombol 1-Klik WA Gratis.
- **Manajemen RSVP & Buku Ucapan**: Pantau daftar tamu yang konfirmasi *Hadir*, *Tidak Hadir*, maupun *Belum Konfirmasi*, lengkap dengan total *pax* dan moderasi ucapan.
- **QR Code Check-in Scanner**: Pemindai QR Code berbasis kamera langsung di browser (`html5-qrcode`) maupun input token manual/scanner USB dengan deteksi anti *double check-in*.
- **Laporan & Export (`Reports`)**: Rekapitulasi lengkap berdasarkan 5 kategori tamu (*Keluarga, Teman, Rekan Kerja, Kerabat, Lainnya*), unduh laporan CSV, dan fitur **Cetak Laporan / Simpan PDF**.

### 2. 📱 Guest Invitation Website (Khusus Tampilan Mobile `360px–430px`)
Website undangan yang dibuka oleh tamu melalui link pribadi (`?token=TOKEN_UNIK`):
- **Personalized Opening Cover**: Menampilkan nama pasangan, foto sampul, nama tamu yang diambil otomatis dari Google Sheets (`Kepada Yth. [Nama Tamu]`), dan tombol `[ BUKA UNDANGAN ]`.
- **13 Seksi Undangan Berurutan**:
  1. Hero Pasangan
  2. Profil Lengkap Mempelai Pria & Wanita beserta Nama Orang Tua
  3. Hitung Mundur Waktu Pernikahan (*Realtime Countdown*)
  4. Kutipan / Ayat Suci & Pengantar Acara
  5. Detail Akad Nikah / Pemberkatan
  6. Detail Resepsi Pernikahan
  7. Lokasi Gedung & Tombol Navigasi Google Maps
  8. Perjalanan Cinta (*Our Love Story Timeline*)
  9. Galeri Foto Interaktif dengan *Lightbox*
  10. Formulir Konfirmasi Kehadiran (RSVP) Tervalidasi Token
  11. Buku Ucapan & Doa Restu *Real-Time*
  12. *Personal Guest Pass* (QR Code Unik Tamu untuk Check-in di Lokasi)
  13. Ucapan Penutup & Musik Latar (otomatis berputar setelah interaksi klik tombol *Buka Undangan*).

---

## 🎨 5 Desain Template Undangan Eksklusif (Bisa Dipilih oleh Admin)

Setiap template memiliki **palet warna, tata letak (*layout*), ornamen SVG, bentuk bingkai foto, dan animasi** yang berbeda:

| No | Nama Template | Karakter Desain, Warna & Ornamen Visual |
| :-: | :--- | :--- |
| **1** | **Elegant Floral** | Warna *Ivory, Cream, Putih, Gold*. Dihiasi garland bunga putih & daun eucalyptus natural, animasi kelopak bunga jatuh (`petalFall`), bingkai katedral lengkung, dan tipografi serif romantis. |
| **2** | **Batak Heritage** | Warna *Merah Marun, Hitam, Cream, Gold*. Dilengkapi ukiran **Gorga Batak** & siluet atap **Rumah Bolon**, pita tenun geometris **Motif Ulos**, bingkai foto oktagonal, dan animasi kilau emas Gorga. |
| **3** | **Modern Minimalist** | Warna *Beige, Putih, Ivory, Cokelat Muda*. Tata letak editorial asimetris (rata kiri), **Monogram Inisial Pasangan (`R\|J`)** otomatis, bingkai persegi dengan bayangan *offset*, dan *whitespace* luas. |
| **4** | **Romantic Sunset** | Warna *Peach, Soft Orange, Champagne, Gold*. Visual gradasi langit senja *cinematic*, pendaran cahaya matahari (*Glowing Sun Orb*), ilustrasi siluet bukit senja, dan kartu *frosted glassmorphism*. |
| **5** | **Dark Luxury** | Warna *Forest Green, Hitam Obsidian, Ivory, Gold*. Latar tekstur berlian (*diamond damask*) emas di atas hijau gelap, crest garis permata emas, bingkai *double gold hairline*, dan kontras malam glamor. |

---

## 🛠️ Teknologi & Arsitektur

- **Frontend**: HTML5, CSS3 (Custom Variables, Grid, Flexbox, Keyframe Animations), Vanilla JavaScript ES6+, Chart.js, SweetAlert2, Lucide Icons, QRCode.js, HTML5-QRCode.
- **Backend & Hosting**: Google Apps Script (V8 Runtime) Web App (`doGet` routing & `google.script.run` RPC dispatcher).
- **Database & Media**:
  - **Google Sheets (`SpreadsheetApp`)**: 1 Spreadsheet utama dengan 8 Sheet yang dibuat otomatis (`Users`, `Weddings`, `Guests`, `Messages`, `RSVP`, `Gallery`, `Checkin`, `Settings`).
  - **Google Drive (`DriveApp`)**: Penyimpanan foto mempelai & galeri, serta konversi otomatis saat import file Excel (`.xlsx`/`.xls`).
  - **Concurrency & Caching**: `LockService` (mencegah tabrakan data saat tamu mengisi RSVP/Check-in bersamaan), `CacheService` (caching konfigurasi undangan & *rate-limiting*), dan `PropertiesService` (menyimpan ID Spreadsheet & kredensial API secara aman di sisi server).

---

## 📚 Dokumentasi Cara Instalasi & Penggunaan Lengkap (Folder `word/`)

Seluruh panduan teknis untuk memasang aplikasi ini di akun Google Apps Script baru maupun panduan penggunaan harian telah disusun secara lengkap di dalam folder **[`word/`](file:///home/man/WEB/Undangan/word)**:

1. 📘 **[Panduan Utama & Daftar Isi Dokumentasi (`word/README.md`)](file:///home/man/WEB/Undangan/word/README.md)**
2. ⚙️ **[Panduan Instalasi & Konfigurasi di Akun Google Apps Script Baru (`word/01-PANDUAN-INSTALASI-APPSCRIPT.md`)](file:///home/man/WEB/Undangan/word/01-PANDUAN-INSTALASI-APPSCRIPT.md)**
   *Cocok bagi siapa saja yang meng-clone repository GitHub ini dan ingin memasangnya di akun Google / Gmail sendiri (baik dengan cara Copy-Paste maupun via terminal `clasp`).*
3. 👩‍💻 **[Panduan Penggunaan Admin Dashboard & Website Tamu (`word/02-PANDUAN-PENGGUNAAN-ADMIN-DAN-TAMU.md`)](file:///home/man/WEB/Undangan/word/02-PANDUAN-PENGGUNAAN-ADMIN-DAN-TAMU.md)**
   *Panduan lengkap cara mengelola tamu, memilih template, mengatur undangan, mengirim WhatsApp, hingga melakukan scan QR Code saat hari acara.*

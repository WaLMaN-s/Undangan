# 👩‍💻 Panduan Penggunaan Admin Dashboard & Website Undangan Tamu

Dokumen ini adalah panduan operasional lengkap bagi pemilik acara (**Admin**) dan panitia penerima tamu dalam menggunakan **Wedding Invitation Management System**.

---

## 1. Cara Membedakan Link Admin dan Link Tamu

Aplikasi ini menggunakan **satu URL Web App utama**, namun otomatis menampilkan antarmuka yang berbeda berdasarkan parameter URL:

1. **Link Admin Dashboard** *(Hanya untuk pemilik acara)*:
   ```text
   https://script.google.com/macros/s/DEPLOYMENT_ID_ANDA/exec
   ```
   Jika dibuka tanpa parameter `?token=...`, sistem selalu menampilkan halaman **Login Admin Dashboard**.

2. **Link Undangan Pribadi Tamu** *(Dibagikan ke masing-masing tamu)*:
   ```text
   https://script.google.com/macros/s/DEPLOYMENT_ID_ANDA/exec?token=TOKEN_UNIK_TAMU
   ```
   Jika dibuka dengan parameter `?token=...`, sistem menampilkan **Website Undangan Mobile (`360px–430px`)** yang sudah terpersonalisasi dengan nama tamu pemilik token tersebut.

---

## 2. Memilih Template Desain & Mengedit Isi Undangan (`Invitation Editor`)

Buka menu **Invitation Editor** di sidebar kiri Admin Dashboard:

### A. Memilih 1 dari 5 Desain Template Undangan
Di bagian paling atas halaman **Invitation Editor**, terdapat **5 kartu desain template**:
1. **Elegant Floral** — Nuansa *Ivory, Cream, Putih, Gold* dengan garland bunga putih, daun eucalyptus, dan animasi kelopak bunga jatuh.
2. **Batak Heritage** — Nuansa *Merah Marun, Hitam, Cream, Gold* dengan ukiran **Gorga Batak**, siluet **Rumah Bolon**, dan pita tenun **Motif Ulos**.
3. **Modern Minimalist** — Nuansa *Beige, Putih, Cokelat Muda* dengan tata letak asimetris rata kiri dan **Monogram Inisial Pasangan (`R|J`)** otomatis.
4. **Romantic Sunset** — Nuansa *Peach, Soft Orange, Champagne* dengan gradasi langit senja, matahari bersinar, dan siluet pemandangan bukit.
5. **Dark Luxury** — Nuansa *Forest Green, Hitam, Gold* dengan tekstur berlian emas dan bingkai *double gold hairline*.

**Cara mengganti template:**
- Klik kartu template yang Anda inginkan $\rightarrow$ lihat perubahannya secara langsung di layar **Live Mobile Preview** di sebelah kanan.
- Klik tombol **"Terapkan Template Sekarang"** (atau tombol **"Simpan & Publikasikan Undangan"** di bagian bawah).

### B. Mengatur Informasi Mempelai, Acara, Cerita, Galeri & Musik
1. **Informasi Mempelai**: Isi nama lengkap, nama panggilan (digunakan juga untuk inisial Monogram), nama orang tua, serta foto mempelai pria, wanita, dan foto sampul.
   - Anda dapat menempelkan link gambar langsung atau klik tombol **Upload Drive** untuk mengunggah foto dari komputer/HP langsung ke folder Google Drive Anda (maksimal 5 MB per foto).
2. **Informasi Waktu & Lokasi Acara**: Atur tanggal pernikahan (otomatis menjadi acuan *Countdown Timer*), jam Akad Nikah / Pemberkatan, jam Resepsi, nama gedung, alamat lengkap, dan link Google Maps.
3. **Kutipan, Cerita Cinta (*Our Story*), Galeri & Musik**:
   - Tambahkan atau hapus bab perjalanan cinta (*Our Story*).
   - Unggah foto-foto prewedding ke **Galeri Foto**.
   - Masukkan URL musik latar (`.mp3`) jika ingin menampilkan musik pada undangan tamu.
4. Klik **Simpan & Publikasikan Undangan**.

---

## 3. Mengelola Database Tamu (`Manajemen Tamu`)

Buka menu **Manajemen Tamu** di sidebar kiri:

### A. Menambah Tamu Satu per Satu
1. Klik tombol **+ Tambah Tamu**.
2. Isi **Nama Lengkap Tamu** (contoh: *Bpk. Budi Santoso & Partner*).
3. Isi **Nomor WhatsApp Indonesia** (boleh diawali `0812...`, `62812...`, atau `+62812...` — sistem otomatis menormalisasi menjadi `62812...` dan menolak jika nomor tersebut sudah pernah didaftarkan sebelumnya).
4. Pilih **Kategori Tamu** (*Keluarga, Teman, Rekan Kerja, Kerabat, Lainnya*).
5. Klik **Simpan Data Tamu**. Sistem otomatis membuatkan token acak kriptografis beserta link undangan pribadinya.

### B. Import Tamu Massal dari File CSV atau Excel (`.xlsx` / `.xls`)
Jika Anda sudah memiliki daftar ratusan tamu di Excel:
1. Klik tombol **Import CSV / Excel**.
2. Klik **Unduh Contoh Template CSV** jika ingin melihat format kolom standar (`guest_name, whatsapp_number, category`).
3. Pilih file **`.csv`** atau file Excel **`.xlsx` / `.xls`** dari komputer Anda, lalu klik **Mulai Import Data**.
   - Untuk file Excel, sistem otomatis mengonversinya melalui Google Drive API.
   - Baris dengan nomor WhatsApp duplikat atau tidak valid akan dilewati secara otomatis dan ditampilkan laporannya.

---

## 4. Mengirim Undangan via WhatsApp (Mode Gratis & Mode Cloud API)

Sistem ini menyediakan **2 cara pengiriman WhatsApp** yang dapat Anda gunakan sesuai kebutuhan:

### Cara 1: Mode 1-Klik Kirim WA Gratis (`wa.me`) — Rp 0 Tanpa API Key
Cara ini **100% gratis**, aman dari pemblokiran, dan langsung memakai WhatsApp Web / Aplikasi WhatsApp di HP Anda:
1. Buka menu **WhatsApp Management** terlebih dahulu untuk mengatur kalimat **Template Pesan Undangan WhatsApp**. Pastikan variabel `{{nama_tamu}}` dan `{{link_undangan}}` ada di dalam template, lalu klik **Simpan Template**.
2. Buka menu **Manajemen Tamu** (atau tabel antrean di **WhatsApp Management**).
3. Klik tombol hijau **`Kirim WA`** pada baris tamu yang ingin dikirim.
4. Tab WhatsApp akan langsung terbuka menuju nomor tamu tersebut dengan teks undangan + nama tamu + link unik yang sudah terketik otomatis. Anda tinggal menekan tombol **Send / Kirim** di WhatsApp.
5. Di Dashboard, status pengiriman tamu tersebut otomatis berubah menjadi **`Terkirim`** dan tercatat di riwayat pengiriman.

### Cara 2: Mode Antrean Otomatis WhatsApp Business Cloud API Resmi (Meta)
Jika Anda memiliki kredensial resmi Meta WhatsApp Business Cloud API:
1. Masuk ke menu **Pengaturan Sistem $\rightarrow$ Pengaturan API WhatsApp (Script Properties)**.
2. Masukkan **Phone Number ID**, **Permanent Access Token**, dan **Business Account ID**, lalu klik **Simpan Kredensial WhatsApp API**.
3. Buka menu **WhatsApp Management**:
   - Klik **Kirim Pesan Percobaan (Cloud API)** untuk mengetes koneksi ke nomor Anda.
   - Pada kartu **Pengiriman Bertahap & Antrean Pesan**, pilih target penerima (*Semua Tamu Belum Dikirim*, *Berdasarkan Kategori*, atau *Semua Tamu*), lalu klik **Masukkan ke Antrean Pengiriman**.
   - Sistem akan memasang *Time-driven Trigger* otomatis di Google Apps Script yang mengirimkan **15 pesan per menit** di latar belakang hingga seluruh antrean selesai.
   - Jika ada pesan yang gagal terkirim, Anda dapat menekan tombol **Retry Semua Pesan Gagal**.

---

## 5. Pengalaman Tamu Membuka Undangan & Mengisi RSVP

Ketika tamu mengklik link undangan pribadinya (`?token=...`) dari pesan WhatsApp:
1. **Sampul Pembuka Personal**: Tamu melihat nama dirinya tertulis secara otomatis di bagian *"Kepada Yth. [Nama Tamu]"*.
2. **Membuka Undangan**: Saat tamu menekan tombol **`[ BUKA UNDANGAN ]`**, layar sampul bergeser halus ke atas, musik latar mulai berputar, dan tamu dapat membaca seluruh informasi acara, melihat foto galeri (*lightbox*), serta membuka navigasi Google Maps.
3. **Mengisi RSVP & Ucapan**:
   - Nama tamu pada formulir RSVP sudah terkunci sesuai token undangannya (mencegah orang luar memalsukan nama tamu lain).
   - Tamu memilih status kehadiran (*Hadir* / *Tidak Hadir*), memilih jumlah orang (*pax*), dan menuliskan ucapan doa.
   - Jika tamu yang sama mengirim ulang formulir RSVP, sistem otomatis memperbarui (*upsert*) data RSVP tamu tersebut tanpa membuat data ganda.
4. **QR Code Guest Pass**: Di bagian bawah undangan, tamu mendapatkan kartu **QR Code Check-in** unik miliknya.

---

## 6. Cara Scan QR Code Check-in Saat Hari Acara (`QR Check-in`)

Pada hari pernikahan di pintu masuk gedung:
1. Petugas penerima tamu membuka **Admin Dashboard** melalui browser HP, Tablet, atau Laptop yang memiliki kamera, lalu masuk ke menu **QR Check-in**.
2. Isi kolom **Nama Petugas / Meja Penerima Tamu** (contoh: *Meja VIP 1*).
3. Klik tombol **Aktifkan Kamera Scanner** dan izinkan akses kamera di browser.
4. Arahkan kamera ke **QR Code** yang ada di layar HP tamu:
   - **Jika Valid & Belum Check-in**: Muncul banner hijau **`✓ CHECK-IN BERHASIL`** beserta nama tamu, kategori tamu, dan jumlah *pax* RSVP-nya.
   - **Jika Sudah Pernah Check-in Sebelumnya**: Sistem menolak duplikasi dan menampilkan peringatan kuning **`⚠️ PERINGATAN: CHECK-IN GANDA DICEGAH`** lengkap dengan jam check-in sebelumnya.
   - **Jika QR Palsu / Tidak Terdaftar**: Muncul peringatan merah **`✕ TOKEN TIDAK VALID`**.
5. *(Alternatif)* Jika menggunakan alat *Barcode/QR Scanner USB* atau ketik manual, cukup arahkan kursor ke kolom **Verifikasi Token Manual** lalu tekan *Enter*.

---

## 7. Mengunduh Laporan & Cetak PDF (`Laporan & Export`)

Setelah atau menjelang acara, buka menu **Laporan & Export**:
- Lihat tabel **Rekapitulasi Berdasarkan Kategori Tamu** untuk mengetahui berapa jumlah tamu dan estimasi *pax* dari *Keluarga, Teman, Rekan Kerja, Kerabat,* dan *Lainnya*.
- Klik **CSV Semua Tamu** atau **CSV Rekap Kategori** untuk membuka data lengkap di Microsoft Excel / Google Sheets.
- Klik **Cetak Laporan / Simpan PDF** untuk mencetak laporan rapi yang siap diserahkan kepada pihak katering, gedung, atau keluarga.

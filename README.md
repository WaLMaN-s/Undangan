# Wedding Invitation Management System (100% Google Apps Script)

Platform pengelolaan undangan pernikahan digital dengan **personalisasi nama tamu otomatis berbasis token**, database **Google Sheets (8 Sheet)**, **Dual-Mode WhatsApp Dispatcher** (*WhatsApp Business Platform Cloud API Resmi* + *1-Klik Kirim WA Gratis `wa.me`*), **RSVP & Buku Ucapan**, **QR Code Check-in Kamera**, serta **Laporan Eksekutif**.

---

## 1. Struktur File Project

Seluruh file di folder `/home/man/WEB/Undangan` dirancang kompatibel 100% dengan **Google Apps Script V8 Runtime**:

### Modul Backend (`.gs`)
1. `appsscript.json` — Manifest konfigurasi V8 Runtime, Zona Waktu `Asia/Jakarta`, dan OAuth Scopes.
2. `Config.gs` — Skema 8 Sheet database, warna/konstanta sistem, helper `PropertiesService`.
3. `Utils.gs` — Hashing SHA-256 + salt unik, generator token kriptografis, sanitasi XSS/Formula Injection, validasi nomor WhatsApp Indonesia (`628...`), rate limiter `CacheService`, parser/generator CSV.
4. `Database.gs` — Lapisan batch read/write `SpreadsheetApp`, `LockService` concurrency guard, dan fungsi `initializeDatabase()` otomatis.
5. `Auth.gs` — Login admin single-owner, proteksi brute-force (lockout setelah 5x gagal), session token di `CacheService`, dan manajemen password.
6. `GuestService.gs` — CRUD tamu, generator token & URL undangan unik, deteksi nomor WA duplikat, import CSV, import Excel melalui konversi Google Drive API, dan bulk delete.
7. `InvitationService.gs` — Pengaturan konten undangan, upload gambar ke Google Drive (maks 5 MB), caching acara (`CacheService`), dan endpoint publik `getInvitationByToken()`.
8. `RSVPService.gs` — Validasi RSVP tamu berbasis token, pencegahan duplikasi RSVP (upsert terkunci `LockService`), dan moderasi RSVP oleh admin.
9. `WhatsAppService.gs` — Template pesan variabel (`{{nama_tamu}}`, `{{link_undangan}}`), antrean pengiriman bertahap via Time-driven Triggers (Meta WhatsApp Cloud API resmi), retry pesan gagal, dan pencatatan pengiriman **1-Klik WA Gratis (`wa.me`)**.
10. `CheckinService.gs` — Verifikasi scan QR Code tamu, pencegahan check-in ganda, dan statistik kehadiran lokasi.
11. `ReportService.gs` — Perhitungan statistik nyata Dashboard Overview (Chart.js), rekapitulasi per kategori tamu, dan export laporan CSV.
12. `Code.gs` — Router `doGet(e)` (memisahkan **Admin Dashboard** dan **Guest Invitation Website Mobile-Only**), helper `include()`, serta RPC bridge `apiDispatcher()`.

### Modul Frontend (`.html`)
1. `AdminDashboard.html` — Antarmuka utama Admin Dashboard (Desktop-first, responsif di tablet & mobile).
2. `StylesAdmin.html` — Desain sistem *Champagne Gold (`#B99A62`) & Ivory (`#F8F5EF`)* + print stylesheet.
3. `ScriptsAdmin.html` — Logika Vanilla JS ES6+ Admin Dashboard (Chart.js, Kamera QR Scanner `html5-qrcode`, Live Mobile Preview, Import/Export).
4. `GuestInvitation.html` — Antarmuka **Guest Invitation Website (Mobile-Only 360–430px)** dengan Sampul Pembuka Personal & 13 seksi utama berurutan.
5. `StylesGuest.html` — Styling khusus frame mobile 360–430px, animasi pembuka, lightbox galeri, dan bottom touch navigation.
6. `ScriptsGuest.html` — Logika Vanilla JS ES6+ halaman tamu (validasi token, countdown realtime, musik latar setelah klik, RSVP form, QR Code pass).

---

## 2. Panduan Setup & Deployment di Google Apps Script

### Langkah 1: Membuat Google Spreadsheet (Database Utama)
1. Buka [Google Sheets](https://sheets.new) dan buat satu Spreadsheet baru bernama **`Wedding Invitation Database`**.
2. Salin **Spreadsheet ID** dari URL browser Anda:
   `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_ANDA_DI_SINI/edit`
3. **Penting (Keamanan)**: Biarkan akses Spreadsheet tetap **Private / Restricted** (hanya akun Google Anda). Jangan pernah membagikan Spreadsheet ke publik.

### Langkah 2: Mengunggah Kode ke Google Apps Script
Anda dapat memilih **Cara A (Otomatis via `clasp` CLI)** atau **Cara B (Copy-Paste Manual)**:

#### Cara A — Menggunakan Google `clasp` CLI dari Terminal:
```bash
npm install -g @google/clasp
clasp login
clasp create --type webapp --title "Wedding Invitation Management System"
clasp push -f
```

#### Cara B — Copy-Paste di Editor Browser:
1. Buka [script.google.com](https://script.google.com) atau dari Google Spreadsheet Anda klik menu **Extensions > Apps Script**.
2. Buat file `.gs` sesuai nama modul (`Config.gs`, `Utils.gs`, `Database.gs`, `Auth.gs`, `GuestService.gs`, `InvitationService.gs`, `RSVPService.gs`, `WhatsAppService.gs`, `CheckinService.gs`, `ReportService.gs`, `Code.gs`) dan salin isinya.
3. Buat file `.html` (`AdminDashboard.html`, `StylesAdmin.html`, `ScriptsAdmin.html`, `GuestInvitation.html`, `StylesGuest.html`, `ScriptsGuest.html`) — *catatan: di editor Apps Script, tulis nama file HTML tanpa ekstensi `.html` karena editor menambahkannya otomatis*.

### Langkah 3: Menghubungkan Spreadsheet ID & Inisialisasi Database Otomatis
1. Di editor Google Apps Script, buka menu **Project Settings (⚙️ Pengaturan Proyek)** di sidebar kiri.
2. Scroll ke bagian bawah **Script Properties (Properti Skrip)**, klik **Add script property**:
   - Property: `SPREADSHEET_ID`
   - Value: *(Tempel Spreadsheet ID Anda dari Langkah 1)*
3. Kembali ke menu **Editor (`< >`)**, buka file `Database.gs`, pilih fungsi **`initializeDatabase`** pada dropdown atas, lalu klik **Run (Jalankan)**.
4. Setujui izin akses (*Review Permissions* > Pilih akun Google Anda > *Advanced* > *Go to project*).
5. Fungsi `initializeDatabase()` akan secara otomatis membuat **8 Sheet wajib** beserta header dan data awal:
   - `Users` (Akun default: username **`admin`** / password **`Admin123!`**)
   - `Weddings`
   - `Guests` (2 contoh tamu awal dengan token unik)
   - `Messages`
   - `RSVP`
   - `Gallery`
   - `Checkin`
   - `Settings`

### Langkah 4: Mengatur Google Drive (Penyimpanan Foto)
1. Saat Anda mengunggah foto pasangan atau galeri melalui **Invitation Editor**, sistem akan otomatis membuat folder bernama **`Wedding_Invitation_Media`** di Google Drive Anda dan menyimpan ID-nya ke Script Property `DRIVE_FOLDER_ID`.
2. Jika Anda ingin menggunakan folder Google Drive tertentu, salin Folder ID dari URL Drive (`drive.google.com/drive/folders/FOLDER_ID`) dan masukkan ke menu **Pengaturan Sistem > Google Drive Folder ID** di Admin Dashboard.

### Langkah 5: Deployment Web App & Pengaturan Akses
1. Di pojok kanan atas editor Google Apps Script, klik **Deploy > New deployment**.
2. Klik ikon roda gigi di samping *Select type*, pilih **Web app**.
3. Isi konfigurasi berikut:
   - **Description**: `Wedding Invitation Production v1`
   - **Execute as**: **Me** *(Jalankan sebagai akun pemilik agar tamu dapat membuka undangan tanpa perlu akses ke Google Sheets Anda)*
   - **Who has access**: **Anyone** *(Siapa saja — agar tamu yang menerima link WhatsApp dapat membuka halaman undangan mobile tanpa wajib login akun Google)*
4. Klik **Deploy** dan salin **Web App URL** (`https://script.google.com/macros/s/DEPLOYMENT_ID/exec`).
5. Buka URL tersebut untuk masuk ke **Admin Dashboard**:
   - Login awal: Username **`admin`**, Password **`Admin123!`**
   - Masuk ke menu **Pengaturan Sistem**:
     1. Tempel **Base URL Deployment Web App (`/exec`)** Anda lalu klik **Simpan Integrasi Google**.
     2. Klik tombol **Sinkronkan Semua Link Tamu** agar semua URL undangan tamu (`?token=...`) menggunakan URL deployment aktif Anda.
     3. Segera ubah password admin default Anda pada kartu **Keamanan & Kredensial Akun Admin**.

---

## 3. Cara Mengakses Antarmuka Admin vs Tamu

| Antarmuka | Format URL | Tampilan |
| :--- | :--- | :--- |
| **Admin Dashboard** | `https://script.google.com/macros/s/.../exec` | Desktop-first (Sidebar & Topbar), responsif di Tablet/HP |
| **Guest Invitation Website** | `https://script.google.com/macros/s/.../exec?token=TOKEN_UNIK_TAMU` | **Mobile-Only (360–430px)** dengan personalisasi nama tamu otomatis |

---

## 4. Konfigurasi Pengiriman WhatsApp (2 Mode: Gratis & Cloud API Resmi)

### Mode 1: 1-Klik Kirim WhatsApp Gratis (`wa.me`) — Rp 0 Tanpa API Key
- Langsung aktif tanpa konfigurasi tambahan.
- Di menu **Manajemen Tamu** atau **WhatsApp Management**, klik tombol hijau **`Kirim WA`** / **`1-Klik WA Gratis`** pada baris tamu.
- Sistem akan otomatis:
  1. Membuka aplikasi WhatsApp / WhatsApp Web menuju nomor tamu tersebut dengan teks undangan + nama tamu + link personal yang sudah terisi penuh.
  2. Mencatat riwayat pengiriman di sheet `Messages` dan mengubah status tamu menjadi **`Terkirim`**.

### Mode 2: WhatsApp Business Platform Cloud API Resmi (Meta)
Jika Anda menggunakan pengiriman antrean otomatis via Meta Cloud API:
1. Buka [Meta for Developers](https://developers.facebook.com/), buat aplikasi tipe **Business**, dan aktifkan produk **WhatsApp**.
2. Salin **Phone Number ID**, **WhatsApp Business Account ID**, dan **Permanent System User Access Token**.
3. Masuk ke **Admin Dashboard > Pengaturan Sistem > Pengaturan API WhatsApp (Script Properties)** dan simpan kredensial tersebut (disimpan aman di `PropertiesService`, tidak pernah disimpan di Spreadsheet atau kode frontend).
4. Di menu **WhatsApp Management**, Anda dapat mengirim pesan percobaan atau memasukkan tamu ke antrean pengiriman bertahap (Time-driven Trigger memproses 15 pesan per menit secara otomatis).

---

## 5. Kuota Google Apps Script & Batas Google Sheets

Penting untuk memahami kuota akun Google gratis (*Consumer Gmail*) saat menjalankan sistem:
1. **Batas Google Sheets**:
   - Maksimal **10.000.000 sel** per Spreadsheet (sangat mencukupi untuk puluhan ribu data tamu, RSVP, dan log pesan).
   - Sistem ini menggunakan teknik **Batch Read/Write (`getValues` / `setValues`)** dan **`CacheService` (TTL 5 menit)** pada konfigurasi acara sehingga hemat panggilan API Spreadsheet.
2. **Kuota `UrlFetchApp` (WhatsApp Cloud API)**:
   - Akun Gmail gratis memiliki batas **20.000 panggilan `UrlFetchApp` per hari**.
3. **Batas Waktu Eksekusi Script**:
   - Maksimal **6 menit per eksekusi**. Oleh karena itu, modul `WhatsAppService.gs` memproses antrean secara bertahap (**15 pesan per batch**) menggunakan **Time-driven Triggers** setiap 1 menit agar tidak pernah terkena *timeout*.
4. **Koneksi Simultan**:
   - Web App Google Apps Script mendukung hingga **30 eksekusi simultan**, dan seluruh operasi tulis sensitif (RSVP, Check-in, Antrean) telah dilindungi oleh **`LockService.getScriptLock()`** untuk mencegah tabrakan data (*race condition*).

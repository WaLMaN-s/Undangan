# ⚙️ Panduan Instalasi & Konfigurasi di Akun Google Apps Script Baru

Panduan ini menjelaskan cara memasang **Wedding Invitation Management System** di akun Google (Gmail) milik siapa saja (akun pribadimu, akun pasangan, atau akun klien) setelah mengunduh atau melakukan `git clone` dari repository ini.

Anda bebas memilih **Metode 1 (Tanpa Install Software — Copy-Paste langsung di Browser)** atau **Metode 2 (Otomatis menggunakan Terminal & `clasp` CLI)**.

---

## 📋 Persiapan Awal: Buat Google Spreadsheet (Database)

1. Login ke akun Google (Gmail) yang akan digunakan sebagai pemilik sistem.
2. Buka [https://sheets.new](https://sheets.new) untuk membuat file Google Spreadsheet kosong baru.
3. Beri nama Spreadsheet tersebut, misalnya: **`Database Undangan Pernikahan`**.
4. Lihat alamat URL di baris browser Anda, lalu salin kode **`SPREADSHEET_ID`** yang berada di antara `/d/` dan `/edit`:
   ```text
   https://docs.google.com/spreadsheets/d/1aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890/edit
                                          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                          Salin bagian ID ini saja
   ```
5. **Catatan Keamanan**: Biarkan status berbagi (*Share*) Google Spreadsheet tersebut tetap **Restricted / Private** (hanya untuk Anda sendiri). Jangan pernah mengubah akses Spreadsheet menjadi publik.

---

## 🖥️ METODE 1: Instalasi Manual via Browser (Copy-Paste Tanpa Terminal)

Metode ini paling mudah bagi pengguna non-teknis karena tidak perlu menginstal Node.js atau membuka terminal.

### Langkah 1: Buka Editor Google Apps Script
1. Dari dalam Google Spreadsheet yang baru Anda buat tadi, klik menu di bagian atas: **Extensions (Ekstensi) $\rightarrow$ Apps Script**.
2. Tab baru **Google Apps Script Editor** akan terbuka. Beri nama project di kiri atas: **`Wedding Invitation System`**.

### Langkah 2: Buat 11 File Backend (`.gs`)
Di sidebar kiri bagian **Files (File)**, secara bawaan sudah ada file `Code.gs`.
Salin dan tempel isi setiap file `.gs` dari repository ini ke dalam editor Apps Script:
- Untuk menambah file `.gs` baru: klik tombol **`+` (Add a file)** $\rightarrow$ pilih **Script (Skrip)** $\rightarrow$ ketik nama file **tanpa menulis `.gs`** (karena Google otomatis menambahkan `.gs`).

Daftar **11 file Script (`.gs`)** yang wajib dibuat:
1. `Code` *(isi dari `Code.gs`)*
2. `Config` *(isi dari `Config.gs`)*
3. `Utils` *(isi dari `Utils.gs`)*
4. `Database` *(isi dari `Database.gs`)*
5. `Auth` *(isi dari `Auth.gs`)*
6. `GuestService` *(isi dari `GuestService.gs`)*
7. `InvitationService` *(isi dari `InvitationService.gs`)*
8. `RSVPService` *(isi dari `RSVPService.gs`)*
9. `WhatsAppService` *(isi dari `WhatsAppService.gs`)*
10. `CheckinService` *(isi dari `CheckinService.gs`)*
11. `ReportService` *(isi dari `ReportService.gs`)*

### Langkah 3: Buat 6 File Frontend (`.html`)
Masih di sidebar kiri bagian **Files**, klik tombol **`+` (Add a file)** $\rightarrow$ pilih **HTML** $\rightarrow$ ketik nama file **tanpa menulis `.html`** (huruf besar-kecil harus persis sama!):

Daftar **6 file HTML** yang wajib dibuat:
1. `AdminDashboard` *(isi dari `AdminDashboard.html`)*
2. `StylesAdmin` *(isi dari `StylesAdmin.html`)*
3. `ScriptsAdmin` *(isi dari `ScriptsAdmin.html`)*
4. `GuestInvitation` *(isi dari `GuestInvitation.html`)*
5. `StylesGuest` *(isi dari `StylesGuest.html`)*
6. `ScriptsGuest` *(isi dari `ScriptsGuest.html`)*

Klik ikon **Save (Simpan / `Ctrl + S`)**.

---

## 💻 METODE 2: Instalasi Otomatis via Terminal (`@google/clasp`)

Jika di komputer Anda sudah terinstal **Node.js** dan **Git**, Anda bisa mengunggah ke-18 file secara otomatis hanya dalam beberapa detik:

1. Aktifkan terlebih dahulu **Google Apps Script API** di akun Google target dengan membuka:
   👉 [https://script.google.com/home/usersettings](https://script.google.com/home/usersettings) lalu ubah tombol menjadi **ON**.
2. Buka terminal di dalam folder repository ini:
   ```bash
   git clone https://github.com/WaLMaN-s/Undangan.git
   cd Undangan
   npm install --no-save @google/clasp
   ```
3. Login ke akun Google target:
   ```bash
   ./node_modules/.bin/clasp login
   ```
   *(Browser akan terbuka, pilih akun Google yang diinginkan lalu klik **Allow / Izinkan**).*
4. Buat project Google Sheets + Apps Script baru dan langsung unggah seluruh file:
   ```bash
   ./node_modules/.bin/clasp create --type sheets --title "Wedding Invitation Management System"
   git checkout -- appsscript.json
   ./node_modules/.bin/clasp push -f
   ```
   *(Perintah `clasp create --type sheets` akan otomatis membuat Google Spreadsheet sekaligus menampilkan link Spreadsheet dan link Editor Apps Script Anda di terminal).*

---

## 🔑 Langkah 4: Hubungkan `SPREADSHEET_ID` & Inisialisasi Database (Wajib)

1. Buka halaman **Editor Google Apps Script** project Anda.
2. Klik ikon **⚙️ Project Settings (Setelan Proyek)** di sidebar paling kiri.
3. Scroll ke bagian paling bawah **Script Properties (Properti Skrip)** $\rightarrow$ klik **Add script property**:
   - **Property**: `SPREADSHEET_ID`
   - **Value**: *(Tempel kode ID Google Spreadsheet Anda)*
   - Klik **Save script properties**.
4. Kembali ke menu **`< >` Editor** di sidebar kiri.
5. Klik file **`Database.gs`**, lalu pada dropdown fungsi di bar atas pilih **`initializeDatabase`** dan klik tombol **Run (Jalankan)**.
6. Saat pertama kali dijalankan, Google akan meminta izin akses (**Authorization required**):
   - Klik **Review permissions** $\rightarrow$ Pilih akun Google Anda.
   - Jika muncul peringatan *"Google hasn't verified this app"*, klik **Advanced (Lanjutan)** di kiri bawah $\rightarrow$ klik **Go to Wedding Invitation System (unsafe)** $\rightarrow$ klik **Allow (Izinkan)**.
7. Setelah proses selesai (*Execution completed*), buka Google Spreadsheet Anda. Sistem telah otomatis membuat **8 Sheet lengkap**:
   `Users`, `Weddings`, `Guests`, `Messages`, `RSVP`, `Gallery`, `Checkin`, dan `Settings`.

---

## 🌐 Langkah 5: Deploy Sebagai Web App

Agar Admin Dashboard dan link undangan tamu dapat diakses lewat browser HP maupun laptop:

1. Di pojok kanan atas Editor Google Apps Script, klik tombol biru **Deploy $\rightarrow$ New deployment**.
2. Klik ikon roda gigi (⚙️) di sebelah tulisan *Select type*, lalu pilih **Web app**.
3. Isi pengaturan berikut dengan tepat:
   - **Description**: `Production v1`
   - **Execute as (Jalankan sebagai)**: **`Me (your_email@gmail.com)`**
     *(Wajib pilih **Me** agar tamu yang membuka undangan tidak diminta akses ke Google Sheets Anda).*
   - **Who has access (Siapa yang memiliki akses)**: **`Anyone (Siapa saja)`**
     *(Wajib pilih **Anyone** agar tamu undangan dapat langsung membuka link dari WhatsApp tanpa harus login akun Google).*
4. Klik tombol **Deploy**, lalu salin **Web App URL** yang berakhiran `/exec`:
   ```text
   https://script.google.com/macros/s/AKfycbxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx/exec
   ```

---

## 🔗 Langkah 6: Sinkronisasi URL Web App Pertama Kali

1. Buka **Web App URL (`/exec`)** yang baru Anda salin di browser.
2. Login ke **Admin Dashboard** menggunakan akun bawaan:
   - **Username**: `admin`
   - **Password**: `Admin123!`
3. Klik menu **Pengaturan Sistem** di sidebar kiri:
   - Pada kolom **Base URL Deployment Web App (`/exec`)**, tempel URL Web App Anda.
   - Klik **Simpan Integrasi Google**.
   - Klik tombol **Sinkronkan Semua Link Tamu** (agar seluruh link undangan tamu otomatis memakai URL Web App milik Anda).
   - Pada kartu **Keamanan & Kredensial Akun Admin**, segera ganti password `Admin123!` menjadi password rahasia Anda sendiri.

🎉 **Selesai!** Aplikasi sudah siap digunakan 100% di akun Google tersebut.

---

## 🛠️ Troubleshooting (Solusi Masalah Umum)

| Kendala | Penyebab & Solusi |
| :--- | :--- |
| **Tamu diminta Login Google saat buka link undangan** | Saat *Deploy Web App*, bagian *Who has access* belum diatur ke **Anyone (Siapa saja)**. Buka *Deploy > Manage deployments > Edit*, ubah menjadi **Anyone**, lalu Deploy. |
| **Muncul pesan "Database Spreadsheet belum terhubung"** | `SPREADSHEET_ID` belum dimasukkan di *Project Settings > Script Properties* atau ID yang dimasukkan salah. |
| **Perubahan kode tidak muncul di link Web App** | Setiap kali Anda mengubah kode di editor Apps Script, Anda harus membuat versi baru melalui **Deploy > Manage deployments > klik ikon Pensil (Edit) > Version: New version > Deploy**. |

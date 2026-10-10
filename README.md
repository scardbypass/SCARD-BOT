<div align="center">

# 🤖 SUPER-BOT

### Modular WhatsApp Automation Bot

**Baileys • Gemini AI • Downloader • Website Monitor • Provider Tools • Automation**

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Baileys](https://img.shields.io/badge/WhatsApp-Baileys-25D366?logo=whatsapp&logoColor=white)](https://github.com/WhiskeySockets/Baileys)
[![PM2](https://img.shields.io/badge/Process-PM2-2B037A?logo=pm2&logoColor=white)](https://pm2.keymetrics.io/)
[![License](https://img.shields.io/badge/Project-SCARD--PROJECT-black)](#)

**Simple • Fast • Modular • Automated**

</div>

---

## 📖 Tentang SUPER-BOT

**SUPER-BOT** adalah bot WhatsApp modular berbasis Node.js + Baileys. Setiap fitur dipisahkan sebagai plugin sehingga fitur baru dapat ditambahkan tanpa membuat core bot berantakan.

Bot mendukung login **Pairing Code atau QR Code**, database JSON lokal, Gemini AI, downloader TikTok/Instagram/YouTube, website monitoring, backup, provider balance, sticker, View Once helper, dan automation voting.

> [!IMPORTANT]
> Gunakan bot dan fitur downloader hanya untuk konten yang memang boleh Anda akses/download. Jangan commit file `.env` atau folder `sessions/` ke repository.

---


---

# 🙏 Ibadah Harian Multi-Grup (SUPER-BOT)

SUPER-BOT dapat mengirim teks Ibadah Harian otomatis dari **ibadahharian.net** ke banyak grup WhatsApp. Pesan menampilkan kredit distribusi **mdcjombang.id**, dengan opsi tag semua anggota memakai **Baileys `mentionAll: true`**. Semua pengaturan khusus **OWNER**; anggota biasa tidak dapat menjalankan perintah manajemen.

## Setup super cepat (1–3 waktu)\n\nDari grup, owner dapat langsung mengetik:\n\n```text\n/ih set 18:00\n/ih set 12:00 18:00\n/ih set 05:00 12:00 18:00\n```\n\nSatu waktu berarti hanya **Malam**, dua waktu berarti **Siang dan Malam**, tiga waktu berarti **Pagi, Siang, Malam**. Perintah langsung mendaftarkan grup bila perlu, menyalakan pengiriman otomatis, audio dan tag @semua. Sesi lain dinonaktifkan. Semua waktu WIB. Untuk sesi lain atau OFF khusus, gunakan `/ih setup` atau `/ih jam` dan `/ih pagi|siang|malam on|off`.\n\n## Pengaturan satu sesi dengan satu perintah\n\nKetik langsung di grup dari akun owner:\n\n```text\n/ih pagi 05:00\n/ih siang 12:00\n/ih malam 18:00\n```\n\nMasing-masing perintah mendaftarkan grup jika perlu, mengaktifkan hanya sesi yang dipilih, mematikan dua sesi lainnya, serta menyalakan audio, tag @semua, dan pengiriman otomatis. Perintah lama `/ih pagi on/off` tetap dapat digunakan untuk menyalakan atau mematikan satu sesi tanpa mengubah sesi lain.\n\n## Setup cepat dalam satu perintah\n\nKetik langsung di grup dari akun owner:\n\n```text\n/ih setup 05:00 12:00 18:00\n```\n\nPerintah ini sekaligus mendaftarkan grup jika belum ada, mengatur jadwal pagi/siang/malam, mengaktifkan ketiga sesi, audio, tag @semua, dan pengiriman otomatis. Gunakan `off` untuk melewatkan sesi, misalnya `/ih setup 06:00 off 19:00`. Menjalankan ulang `setup` akan mengganti pengaturan sesi/audio/tag grup tersebut. Perintah setup tidak berlaku dari chat pribadi.\n\n## Memulai

Grup utama lama `120363430536068297@g.us` tetap menjadi konfigurasi awal. Jadwal dan status lamanya dimigrasikan otomatis saat penyimpanan konfigurasi multi-grup pertama. Grup baru didaftarkan dalam keadaan **otomatis OFF**, sehingga tidak langsung mengirim tanpa persetujuan owner. Untuk grup baru, **tag @semua ON** dan **audio ON** secara default.

Di dalam grup baru, owner mengirim:

```text
/ih add
/ih status
/ih jam pagi 06:00
/ih jam siang 13:00
/ih jam malam 19:00
/ih on
```

Gunakan `/ih help` atau `/ibadahharian help` untuk bantuan. Semua jam menggunakan **Asia/Jakarta (WIB)**.

## Daftar perintah lengkap

| Perintah | Fungsi |
|---|---|
| `/ih help` | Menu Ibadah Harian |
| `/ih grup` | Daftar semua grup dan jadwal |
| `/ih add` | Tambah grup tempat perintah dikirim |
| `/ih add 120xxx@g.us` | Tambah grup lewat ID (dari chat owner) |
| `/ih del` | Hapus grup saat ini dari scheduler |
| `/ih del 120xxx@g.us` | Hapus grup lewat ID |
| `/ih status` | Status grup saat ini |
| `/ih on` / `/ih off` | Hidup/matikan otomatis untuk grup |
| `/ih pagi on/off` | Aktifkan/nonaktifkan sesi pagi |
| `/ih siang on/off` | Aktifkan/nonaktifkan sesi siang |
| `/ih malam on/off` | Aktifkan/nonaktifkan sesi malam |
| `/ih jam pagi 05:00` | Jadwal pagi grup |
| `/ih jam siang 12:00` | Jadwal siang grup |
| `/ih jam malam 18:00` | Jadwal malam grup |
| `/ih audio on/off` | Audio tambahan per grup |
| `/ih tag on/off` | Tag @semua per grup |
| `/ih test pagi` | Tes materi pagi ke grup |
| `/ih test siang` | Tes materi siang ke grup |
| `/ih test malam` | Tes materi malam ke grup |

Dari chat pribadi owner, tambahkan ID grup sebagai argumen terakhir, misalnya:

```text
/ih status 120363430536068297@g.us
/ih on 120363430536068297@g.us
/ih jam malam 20:00 120363430536068297@g.us
/ih audio off 120363430536068297@g.us
/ih tag on 120363430536068297@g.us
/ih test malam 120363430536068297@g.us
```

## Cara kerja

1. Scheduler memeriksa waktu setiap 15 detik menggunakan WIB.
2. Setiap grup punya `enabled`, pengaturan sesi dan waktu sendiri, `audioEnabled`, serta `tagEnabled`.
3. Bot hanya mengirim pada grup dan sesi yang aktif sesuai waktu.
4. Penanda terkirim menggunakan **ID grup + tanggal + sesi**, mencegah duplikasi terjadwal per grup.
5. Materi diambil dari website saat pengiriman, lalu teks dikirim ke grup. Apabila terlalu panjang, pesan dibagi.
6. Jika tag aktif, pesan teks terakhir berakhir dengan `@semua` dan metadata `mentionAll: true`; notifikasi bergantung pada dukungan WhatsApp serta hak admin grup.
7. Jika audio aktif, bot mengunduh MP3 yang tersedia ke **RAM**, bukan menyimpan file permanen. Jika audio tidak ditemukan atau gagal, teks tetap terkirim.
8. Audio website dapat berasal dari tahun arsip yang berbeda; **kesesuaian audio dengan teks hari ini tidak dijamin**. Matikan dengan `/ih audio off` bila perlu.
9. Perintah `test` mengirim ulang secara manual, tidak menandai jadwal harian sebagai terkirim.

> **Catatan:** Untuk banyak grup dengan jadwal bersamaan, pengiriman berjalan berurutan, bukan paralel. Materi website saat ini diambil ulang per pengiriman; belum ada cache bersama lintas grup. Pastikan bot sudah bergabung dalam grup tujuan. Jangan menggunakan `/ih add` di grup yang tidak ingin menerima ibadah otomatis.


### Menambah owner dari chat pribadi

Perintah khusus owner, dijalankan lewat chat pribadi SUPER-BOT (bukan di grup):

```text
/addowner 6281234567890
/listowner
/delowner 6281234567890
```

Nomor harus lengkap dalam format internasional 62. Nomor owner tambahan disimpan dalam database sebagai `settings.extraOwners`, sehingga tidak perlu mengubah `.env`. Owner utama dari `OWNER_NUMBER` tidak dapat dihapus dengan `/delowner`. Hanya owner terautentikasi dan akun WhatsApp bot sendiri yang dapat mengatur menu `/ih` (Ibadah Harian); anggota biasa tidak mendapat akses. Jangan menambahkan nomor pendek atau belum dikonfirmasi.

## Akses owner dan nomor tambahan

Semua perintah `/ih` dilindungi `ownerOnly: true` di plugin, dan diverifikasi oleh core bot. Owner utama menggunakan `OWNER_NUMBER` pada `.env`; akun dengan `role: owner` dalam database juga dapat mengelola. **Jangan menambahkan nomor owner yang belum lengkap**. Nomor `628182727` belum dikonfirmasi sebagai nomor WhatsApp lengkap, sehingga tidak otomatis dimasukkan.

## Update dan verifikasi

```bash
cd /root/SCARD-BOT
git pull origin main
node --check lib/ibadahScheduler.js
node --check plugins/ibadahharian.js
node --check plugins/menu.js
pm2 restart SCARD-BOT --update-env
pm2 logs SCARD-BOT --lines 50 --nostream
```

Setelah itu, jalankan `/ih grup`, `/ih status`, dan `/ih test malam` dari akun owner. Jika tidak muncul notifikasi @semua, pastikan akun bot admin grup dan WhatsApp mendukung mentionAll pada grup tersebut.


## ✨ Fitur Utama

| Fitur | Keterangan |
|---|---|
| 🔑 Pairing / QR | Metode login dapat dipilih dari `.env` |
| 🧩 Plugin System | Command dipisah ke folder `plugins/` |
| 👤 Role System | PUBLIC, REGISTERED, dan OWNER |
| 🧠 Gemini AI | AI private + mention/reply di grup |
| 🎬 Downloader | TikTok, Instagram, YouTube |
| 🔎 WHOIS / RDAP | Informasi domain, registrar, NS, tanggal |
| 🌐 Website Status | HTTP, response time, SSL |
| 🚨 Website Monitor | Notifikasi hanya saat UP/DOWN berubah |
| 💾 Backup | ZIP source + database tanpa secret/session |
| 🏸 Auto Voting | Voting badminton terjadwal |
| 💰 Provider Balance | RoamerCheck, AirBot, SickW, eSIMAccess, Order Kuota/Okeconnect |
| 💳 QRIS Payment | Buat QRIS nominal dinamis dari QRIS merchant statis + auto-delete |
| 🖼️ Sticker | Foto/video menjadi sticker |
| 👁️ View Once | Mengambil ulang media View Once yang masih tersedia |

---

## 🔐 Level Akses

**PUBLIC** dapat dipakai siapa saja tanpa registrasi. **REGISTERED** hanya untuk nomor yang ada di database. **OWNER** hanya untuk nomor owner / role owner.

| Command | Akses | Fungsi |
|---|---|---|
| `/stiker`, `/sticker`, `/s` | 🌍 PUBLIC | Membuat sticker dari foto/video |
| `/download`, `/dl` | 🌍 PUBLIC | Download video dengan reply link |
| `/whois <domain>` | 🌍 PUBLIC | WHOIS/RDAP domain |
| `/statusweb <domain>` | 🌍 PUBLIC | Cek HTTP + SSL website |
| `/qris <nominal>` / `qris <nominal>` | 🌍 PUBLIC | Buat QRIS pembayaran sesuai nominal |
| `/menu`, `/help` | 👤 REGISTERED | Menu bot |
| `/akun`, `/profil` | 👤 REGISTERED | Profil akun |
| `/groupinfo`, `/profilgrup` | 👤 REGISTERED | Informasi grup |
| `/lihat` | 👤 REGISTERED | Reply media View Once |
| `/aion` | 👑 OWNER | Aktifkan Gemini AI |
| `/aioff` | 👑 OWNER | Matikan Gemini AI |
| `/aistatus` | 👑 OWNER | Status Gemini |
| `/saldoceir` | 👑 OWNER | Saldo provider |
| `/airbot <nominal>` | 👑 OWNER | Request deposit AirBot |
| `depoapi` | 👑 OWNER | Konfirmasi topup CEIR setelah request AirBot |
| `testvoting` | 👑 OWNER | Kirim polling test tanpa mengubah jadwal otomatis |
| `/monitor add <domain>` | 👑 OWNER | Tambah website monitor |
| `/monitor del <domain>` | 👑 OWNER | Hapus website monitor |
| `/monitor list` | 👑 OWNER | Daftar website monitor |
| `/backup` | 👑 OWNER | Backup source + database |
| `/qristxt on` / `/qristxt off` | 👑 OWNER | Hidup/matikan pesan proses pembuatan QRIS |

---

# 🚀 Instalasi VPS dari Nol

Panduan ini ditujukan untuk Debian/Ubuntu VPS.

## 1. Update VPS

```bash
sudo apt update && sudo apt upgrade -y
```

## 2. Install kebutuhan sistem

```bash
sudo apt install -y git curl ffmpeg python3 python3-pip zip
```

Downloader membutuhkan **yt-dlp**:

```bash
python3 -m pip install -U yt-dlp
```

Jika distro menolak instalasi pip global, install yt-dlp menggunakan metode resmi yang sesuai distro/server Anda.

Cek:

```bash
ffmpeg -version
yt-dlp --version
zip -v
```

## 3. Install Node.js

Disarankan Node.js **18+**.

Contoh menggunakan NodeSource:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

Cek:

```bash
node -v
npm -v
```

## 4. Install PM2

```bash
sudo npm install -g pm2
pm2 -v
```

## 5. Clone SUPER-BOT

```bash
cd /root
git clone https://github.com/scardbypass/SCARD-BOT.git
cd SCARD-BOT
```

## 6. Install dependency Node.js

```bash
npm install
```

## 7. Buat file konfigurasi

```bash
cp .env.example .env
nano .env
```

---

# ⚙️ Konfigurasi .env

Contoh konfigurasi:

```env
BOT_NAME=SUPER-BOT
PREFIX=/

OWNER_NUMBER=628xxxxxxxxxx

# pairing / qr
LOGIN_METHOD=pairing
PAIRING_NUMBER=628xxxxxxxxxx

AUTO_READ=false
TIMEZONE=Asia/Jakarta

# AirBot
AIRBOT_GROUP_ID=120xxxxxxxxxxxxxxxx@g.us
AIRBOT_TIMEOUT_MS=15000
AIRBOT_BALANCE_COMMAND=/api saldo
AIRBOT_QR_DELETE_MINUTES=10

# Voting badminton
VOTING_GROUP_ID=120xxxxxxxxxxxxxxxx@g.us
VOTING_ENABLED=true
VOTING_HOUR=10
VOTING_MINUTE=0

# Provider
ROAMERCHECK_USERNAME=
ROAMERCHECK_API_KEY=
SICKW_API_KEY=
SICKW_USD_TO_IDR=19500

# eSIMAccess
ESIMACCESS_ACCESS_CODE=
ESIMACCESS_SECRET_KEY=
ESIMACCESS_USD_TO_IDR=19500

# Order Kuota / Okeconnect
ORDERKUOTA_MEMBER_ID=
ORDERKUOTA_PIN=
ORDERKUOTA_PASSWORD=

QCEIR_API_KEY=

# QRIS Payment
# Isi payload QRIS statis merchant. Jangan commit QRIS/credential sensitif ke repo publik.
QRIS_STATIC=
QRIS_DELETE_MINUTES=5

# Gemini
GEMINI_API_KEY=
GEMINI_MODEL=
GEMINI_SYSTEM_PROMPT=Kamu adalah asisten WhatsApp SUPER-BOT.

# Downloader
YTDLP_PATH=yt-dlp
DOWNLOAD_MAX_SIZE=150M
DOWNLOAD_MAX_BYTES=157286400
DOWNLOAD_TIMEOUT_MS=180000

# Website Monitor
MONITOR_INTERVAL_MINUTES=30
MONITOR_TIMEOUT_MS=12000
```

> [!WARNING]
> Jangan upload `.env` ke GitHub. API key, nomor owner, ID grup, dan credential lain harus tetap private.

---

# 📱 Login WhatsApp

## Opsi A — Pairing Code

Di `.env`:

```env
LOGIN_METHOD=pairing
PAIRING_NUMBER=628123456789
```

Nomor gunakan format internasional **62**, bukan diawali `0`.

Jalankan:

```bash
npm start
```

Terminal akan menampilkan pairing code. Masukkan kode tersebut dari menu perangkat tertaut WhatsApp.

## Opsi B — QR Code

Ubah:

```env
LOGIN_METHOD=qr
```

Kemudian:

```bash
npm start
```

QR akan tampil di terminal. Buka WhatsApp → **Perangkat tertaut → Tautkan perangkat** lalu scan QR.

### Ganti akun / session

Stop bot dan hapus session lama:

```bash
pm2 stop SCARD-BOT
rm -rf sessions
mkdir -p sessions
npm start
```

Setelah berhasil login, hentikan proses foreground dengan <kbd>Ctrl</kbd> + <kbd>C</kbd>, lalu jalankan melalui PM2.

---

# ♾️ Menjalankan 24/7 dengan PM2

```bash
cd /root/SCARD-BOT
pm2 start index.js --name SCARD-BOT
pm2 save
pm2 startup
```

Perintah `pm2 startup` biasanya menampilkan satu command tambahan. Jalankan command tersebut, kemudian:

```bash
pm2 save
```

### Command PM2 penting

```bash
pm2 status
pm2 logs SCARD-BOT
pm2 restart SCARD-BOT
pm2 stop SCARD-BOT
```

---

# 🎬 Downloader

Kirim link TikTok/Instagram/YouTube, kemudian **reply pesan link tersebut**:

```text
/download
```

Alias:

```text
/dl
```

Prioritas kualitas:

```text
2K / 1440p
     ↓
1080p
     ↓
720p
     ↓
Best available
```

Bot **tidak melakukan upscale**. Jika sumber hanya tersedia 720p, hasilnya tetap 720p.

Default batas file adalah **150 MB**:

```env
DOWNLOAD_MAX_SIZE=150M
DOWNLOAD_MAX_BYTES=157286400
```

Video disimpan sementara di direktori temp VPS, dikirim ke WhatsApp, kemudian file sementara dibersihkan.

---

# 💳 QRIS Payment

Command QRIS bersifat **PUBLIC**, jadi dapat digunakan oleh pengguna yang belum terdaftar sekalipun. Prefix `/` bersifat opsional sesuai router bot.

Contoh:

```text
qris 1000
/qris 15000
```

Alurnya:

1. User mengirim command beserta nominal.
2. Jika pesan proses aktif, bot menampilkan **SCARD PAYMENT** selama QRIS dibuat.
3. Bot mengubah payload QRIS statis menjadi QRIS dengan nominal transaksi dan membuat gambar QR.
4. Setelah QRIS berhasil terkirim, pesan proses otomatis dihapus.
5. Pesan gambar QRIS otomatis ditarik setelah waktu pada `QRIS_DELETE_MINUTES` (default 5 menit).

Konfigurasi:

```env
QRIS_STATIC=PAYLOAD_QRIS_STATIS_MERCHANT
QRIS_DELETE_MINUTES=5
```

Owner dapat mengatur pesan proses langsung dari WhatsApp:

```text
/qristxt off
/qristxt on
```

Pengaturan `qristxt` disimpan di database sehingga tidak hilang saat bot direstart. Perlu dicatat, timer 5 menit mengatur **penghapusan pesan QRIS di WhatsApp**; ini bukan jaminan bahwa transaksi di sisi acquirer/payment provider kedaluwarsa setelah 5 menit.

---

# 🌐 Website Tools

## WHOIS

```text
/whois ceirgo.id
```

Menampilkan status domain, registrar, tanggal registrasi/perubahan/expired, dan nameserver berdasarkan RDAP yang tersedia.

## Status Website

```text
/statusweb ceirgo.id
```

Menampilkan status online/down, HTTP status, response time, validitas SSL, issuer dan tanggal expired SSL.

## Website Monitor

Khusus owner:

```text
/monitor add ceirgo.id
/monitor list
/monitor del ceirgo.id
```

Default pengecekan:

```env
MONITOR_INTERVAL_MINUTES=30
```

Monitor tidak mengirim pesan setiap pengecekan. Notifikasi dikirim hanya ketika status berubah:

```text
🟢 UP → 🔴 DOWN
🔴 DOWN → 🟢 UP
```

---

# 💾 Backup

Khusus owner:

```text
/backup
```

Bot membuat ZIP dan mengirimnya ke chat WhatsApp.

Backup mencakup source, plugin, library, konfigurasi contoh, dan database. Demi keamanan, backup **tidak menyertakan**:

```text
.env
sessions/
node_modules/
*.log
```

File ZIP sementara di VPS dihapus setelah proses pengiriman selesai.

---

# 🧠 Gemini AI

Owner mengontrol AI menggunakan:

```text
/aion
/aioff
/aistatus
```

Saat AI aktif:

- Private chat: user **REGISTERED** dapat mengirim teks langsung.
- Grup: AI merespons jika bot di-mention atau pesan bot direply.
- User yang belum terdaftar tidak mendapatkan akses AI.

API key diatur melalui:

```env
GEMINI_API_KEY=YOUR_API_KEY
GEMINI_MODEL=MODEL_YANG_DIGUNAKAN
```

---

# 🏸 Auto Voting Badminton

Voting otomatis dikirim:

- Minggu → untuk Senin
- Kamis → untuk Jumat
- Default pukul **10:00 WIB**

Pilihan poll:

```text
🏸 GAS
😁 IZIN
```

Konfigurasi:

```env
VOTING_GROUP_ID=120xxxxxxxxxxxxxxxx@g.us
VOTING_ENABLED=true
VOTING_HOUR=10
VOTING_MINUTE=0
TIMEZONE=Asia/Jakarta
```

---

# 💰 AirBot & Provider

Contoh request deposit:

```text
/airbot 100000
```

SUPER-BOT mengirim:

```text
/deposit 100000
```

ke grup AirBot. Setelah itu reply pesan konfirmasi private dengan:

```text
/ceir deposit
```

Bot akan mengirim:

```text
/Api topup 100000
```

Command owner:

```text
/saldoceir
```

mengambil saldo RoamerCheck, AirBot, SickW, eSIMAccess, dan Order Kuota/Okeconnect yang dikonfigurasi. Saldo USD dari SickW dan eSIMAccess juga ditampilkan sebagai estimasi IDR berdasarkan kurs di `.env`.

Untuk eSIMAccess, `AccessCode` digunakan oleh endpoint cek saldo melalui header `RT-AccessCode`. `SecretKey` tetap disimpan di `.env` untuk endpoint eSIMAccess yang memerlukan HMAC signature; fitur cek saldo saat ini tidak mengirim SecretKey.

---

# 📂 Struktur Project

```text
SUPER-BOT/
├── index.js
├── package.json
├── .env.example
├── database/
│   └── database.json
├── lib/
│   ├── airbotBridge.js
│   ├── database.js
│   ├── gemini.js
│   ├── pluginLoader.js
│   ├── providers.js
│   ├── utils.js
│   ├── votingScheduler.js
│   ├── webStatus.js
│   └── websiteMonitor.js
├── plugins/
│   ├── ai.js
│   ├── airbot.js
│   ├── akun.js
│   ├── backup.js
│   ├── download.js
│   ├── groupinfo.js
│   ├── lihat.js
│   ├── menu.js
│   ├── monitor.js
│   ├── qris.js
│   ├── saldoceir.js
│   ├── statusweb.js
│   ├── stiker.js
│   ├── testvoting.js
│   └── whois.js
└── sessions/
```

---

# 🧩 Membuat Plugin Baru

Contoh minimal:

```js
module.exports = {
  commands: ['ping'],
  registered: false,
  menuSection: 'PUBLIC',
  menu: '/ping',

  async run({ reply }) {
    return reply('Pong 🏓')
  }
}
```

### Metadata plugin

| Property | Fungsi |
|---|---|
| `commands` | Daftar command plugin |
| `registered: false` | Membolehkan user publik |
| `registered: true` | Memerlukan user terdaftar |
| `ownerOnly: true` | Khusus owner |
| `menu` | Teks yang ditampilkan oleh menu |
| `run()` | Handler command |

> Jika `registered` tidak diset ke `false`, core memperlakukan plugin sebagai command user terdaftar.

---

# 🔄 Update SUPER-BOT

```bash
cd /root/SCARD-BOT
git pull origin main
npm install
pm2 restart SCARD-BOT
```

`npm install` penting jika update membawa dependency baru.

---

# 🛠️ Troubleshooting

<details>
<summary><b>Bot tidak membalas command</b></summary>

Cek log:

```bash
pm2 logs SCARD-BOT
```

Pastikan command memang PUBLIC atau nomor sudah terdaftar. Command owner hanya bekerja untuk `OWNER_NUMBER` / role owner.

</details>

<details>
<summary><b>QR / pairing tidak muncul</b></summary>

Jika ingin login ulang:

```bash
pm2 stop SCARD-BOT
rm -rf sessions
mkdir -p sessions
npm start
```

Pastikan `LOGIN_METHOD` bernilai `pairing` atau `qr`.

</details>

<details>
<summary><b>/download gagal</b></summary>

Cek:

```bash
yt-dlp --version
ffmpeg -version
```

Update yt-dlp bila perlu:

```bash
python3 -m pip install -U yt-dlp
```

Konten private/login-required atau konten yang tidak tersedia dapat gagal didownload.

</details>

<details>
<summary><b>/backup gagal</b></summary>

Pastikan ZIP terinstall:

```bash
sudo apt install -y zip
```

</details>

<details>
<summary><b>Setelah edit .env perubahan belum aktif</b></summary>

Restart:

```bash
pm2 restart SCARD-BOT
```

Jika PM2 mempertahankan environment lama, gunakan:

```bash
pm2 restart SCARD-BOT --update-env
```

</details>

---

## 🔒 Security Checklist

- Jangan commit `.env`.
- Jangan membagikan folder `sessions/`.
- Jangan menaruh API key langsung di plugin.
- Batasi command sensitif dengan `ownerOnly: true`.
- Backup yang dikirim bot tidak menyertakan `.env` dan session WhatsApp.
- Simpan VPS dan dependency tetap ter-update.

---

<div align="center">

### ⚡ SUPER-BOT

Built for modular WhatsApp automation.

**SCARD-PROJECT**

</div>

<div align="center">

# 🤖 SCARD-BOT

### Modular WhatsApp Automation Bot

**Baileys • Gemini AI • Downloader • Website Monitor • Provider Tools • Automation**

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Baileys](https://img.shields.io/badge/WhatsApp-Baileys-25D366?logo=whatsapp&logoColor=white)](https://github.com/WhiskeySockets/Baileys)
[![PM2](https://img.shields.io/badge/Process-PM2-2B037A?logo=pm2&logoColor=white)](https://pm2.keymetrics.io/)
[![License](https://img.shields.io/badge/Project-SCARD--PROJECT-black)](#)

**Simple • Fast • Modular • Automated**

</div>

---

## 📖 Tentang SCARD-BOT

**SCARD-BOT** adalah bot WhatsApp modular berbasis Node.js + Baileys. Setiap fitur dipisahkan sebagai plugin sehingga fitur baru dapat ditambahkan tanpa membuat core bot berantakan.

Bot mendukung login **Pairing Code atau QR Code**, database JSON lokal, Gemini AI, downloader TikTok/Instagram/YouTube, website monitoring, backup, provider balance, sticker, View Once helper, dan automation voting.

> [!IMPORTANT]
> Gunakan bot dan fitur downloader hanya untuk konten yang memang boleh Anda akses/download. Jangan commit file `.env` atau folder `sessions/` ke repository.

---

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

## 5. Clone SCARD-BOT

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
BOT_NAME=SCARD-BOT
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

# Gemini
GEMINI_API_KEY=
GEMINI_MODEL=
GEMINI_SYSTEM_PROMPT=Kamu adalah asisten WhatsApp SCARD-BOT.

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

SCARD-BOT mengirim:

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
SCARD-BOT/
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

# 🔄 Update SCARD-BOT

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

### ⚡ SCARD-BOT

Built for modular WhatsApp automation.

**SCARD-PROJECT**

</div>

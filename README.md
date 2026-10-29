<div align="center">

# 🤖 SUPER-BOT

### V2 • Modular WhatsApp Automation Bot

**Baileys • Gemini AI • Downloader • Website Monitor • Provider Tools • Automation**

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Baileys](https://img.shields.io/badge/WhatsApp-Baileys-25D366?logo=whatsapp&logoColor=white)](https://github.com/WhiskeySockets/Baileys)
[![PM2](https://img.shields.io/badge/Process-PM2-2B037A?logo=pm2&logoColor=white)](https://pm2.keymetrics.io/)
[![License](https://img.shields.io/badge/Project-SCARD--PROJECT-black)](#)

**Branch `v2` • Development fitur baru • `main` tetap production/stable**

</div>

---

## 📖 Tentang SUPER-BOT

**SUPER-BOT** adalah bot WhatsApp modular berbasis Node.js + Baileys. Setiap fitur dipisahkan sebagai plugin sehingga fitur baru dapat ditambahkan tanpa membuat core bot berantakan.

Bot mendukung login **Pairing Code atau QR Code**, database JSON lokal, Gemini AI, downloader TikTok/Instagram/YouTube, website monitoring, backup, provider balance, sticker, View Once helper, dan automation voting.

> [!IMPORTANT]
> README ini untuk **branch `v2`**. Fitur V2 diuji di branch ini sebelum nantinya dipertimbangkan untuk masuk ke `main`.
>
> Gunakan bot dan fitur downloader hanya untuk konten yang memang boleh Anda akses/download. Jangan commit file `.env` atau folder `sessions/` ke repository.

---


---

# 📱 IMEI CENTER — 3B / 1B / 3BS / 3BD (V2)

Empat perintah berbagi mesin order, tetapi harga dan grup operator **terpisah untuk setiap layanan**. IMEI yang masih diproses di salah satu layanan ditolak di layanan lainnya. Setiap order terlebih dahulu diperiksa lewat REST API CeirGo: `POST /api/order` dengan `code=cek_imei`, lalu `GET /api/order/{id}` bila pending. Hanya hasil IMEI **UNKNOWN** yang diteruskan; ROAMER, REGISTERED, error, atau hasil ambigu ditolak. Pengecekan API dapat mengurangi saldo CeirGo meskipun order 3B ditolak.

## Konfigurasi VPS

```env
BOT_NAME=SUPER-BOT
OWNER_NUMBER=628xxxxxxxxxx
CEIRGO_API_BASE_URL=https://ceirgo.id
CEIRGO_API_KEY=ISI_DI_VPS_SAJA
CEIRGO_IMEI_SERVICE_CODE=cek_imei
CEIRGO_TIMEOUT_MS=20000
CEIRGO_POLL_ATTEMPTS=8
CEIRGO_POLL_INTERVAL_MS=3000
TIMEZONE=Asia/Jakarta
```

Jangan commit `.env`. **Tidak ada API key dalam chat, invoice, maupun source**. Periksa harga layanan aktual di `GET /api/services/cek_imei`; harga API bukan harga jual seller.

## Langkah konfigurasi WhatsApp (owner)

1. Masuk ke masing-masing **grup operator** dan jalankan `/3b operator set`, `/1b operator set`, `/3bs operator set`, atau `/3bd operator set`. Keempatnya boleh menunjuk grup berbeda.
2. Masuk ke setiap **grup seller**, jalankan `/3b add` untuk mendaftarkan grup.
3. Tetapkan harga global setiap layanan: `/3b harga global 25000`, `/1b harga global 15000`, `/3bs harga global 35000`, `/3bd harga global 40000`. **Angka hanya contoh**.
4. Jika perlu harga khusus, ketik `/3bs harga 30000` di grup seller; `/3bs harga default` mengembalikan ke global.
5. Set rekening invoice, misalnya `/3b bank BCA 1234567890 NAMA PEMILIK`.

| Perintah | Akses | Fungsi |
|---|---|---|
| `/3b`, `/1b`, `/3bs`, `/3bd` | Anggota grup seller | Menu harga & contoh order |
| `/3b 356424104776994` | Anggota grup seller | Cek CEIR dan order jika UNKNOWN |
| `/3b add` / `/3b del` | Owner di grup seller | Daftarkan / hapus grup |
| `/3bs operator set` / `off` | Owner di grup operator | Set / nonaktifkan grup operator layanan |
| `/1b harga global 15000` | Owner | Harga global layanan |
| `/3bd harga 40000` / `default` | Owner di grup seller | Harga custom / global |
| `/3b on` / `off` | Owner di grup seller | Aktif/nonaktif layanan di grup |
| `/3b global on` / `off` | Owner | Aktif/nonaktif seluruh layanan |
| `/3b status` | Owner | Konfigurasi layanan |
| `/3b invoice` | Anggota grup seller | Tagihan outstanding gabungan |
| `/payment all` | Owner di grup seller | Lihat konfirmasi pembayaran semua layanan |
| `/payment 3bs confirm` | Owner di grup seller | Tandai lunas hanya tagihan 3BS |
| `/payment all confirm` | Owner di grup seller | Tandai lunas semua tagihan |

Operator mana pun di grup operator terdaftar bisa **reply pesan order bot** dengan `DONE` atau `FAILED`. Reply harus menunjuk pesan order asli, bukan teks bebas tanpa reply. Nomor bot sendiri tidak diproses sebagai perintah reply agar tidak berulang.

**Penagihan**: sukses menambah outstanding dengan harga saat order dibuat; `FAILED` tidak ditagih. Invoice outstanding otomatis dikirim **21.00 WIB** setiap hari selama masih ada tagihan. Hanya owner boleh menandai lunas lewat `/payment ... confirm`. Pending tidak ditagih; sukses setelah pelunasan masuk tagihan baru.

**Backup**: pukul **00.00 WIB** bot mengirim rekap dan JSON hari sebelumnya ke chat pribadi owner. Setelah kedua pesan berhasil dikirim, data harian gagal/ditolak serta sukses yang sudah lunas dapat dibersihkan. Outstanding dan pending **tidak dihapus**. File `database/imei-center.json` wajib dibackup secara aman, jangan dipublikasikan: memuat IMEI dan metadata grup. Konfigurasi dan transaksi berjalan tetap disimpan saat restart.

**Batasan sebelum produksi**: dokumentasi publik CeirGo menampilkan `result_schema` sebagai object generik; parser hanya menerima status eksplisit UNKNOWN/ROAMER/REGISTERED. Periksa respons akun asli (redaksi token/IMEI) dan uji pengiriman Baileys sebelum layanan dinyalakan untuk seller. Scheduler berjalan pada satu proses bot; jangan jalankan dua instance terhadap database JSON yang sama. Keberhasilan `sendMessage` bukan bukti penerima membaca pesan. Pengecekan API yang timeout dapat saja telah dikenai biaya.

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
| 📣 Promosi V2 | Kirim text/foto/video ke subscriber tersimpan, satu per satu dengan delay |
| 📦 Export WA V2 | `/importwa` mengirim database subscriber sebagai JSON ke private owner |
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
| `/promosi <pesan>` | 👑 OWNER | Kirim promosi text atau reply foto/video ke subscriber |
| `/promosiadd <nomor>` | 👑 OWNER | Tambah nomor subscriber promosi |
| `/promosidel <nomor>` | 👑 OWNER | Hapus nomor subscriber promosi |
| `/promosilist` | 👑 OWNER | Lihat daftar subscriber promosi |
| `/importwa` | 👑 OWNER | Export subscriber ke `promo-subscribers.json` lewat private chat |
| `/stop` | 🌍 PUBLIC | Berhenti menerima promosi |

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
sudo apt install -y python3-venv\npython3 -m venv /opt/yt-dlp-venv\n/opt/yt-dlp-venv/bin/pip install -U "yt-dlp[default]"
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
git clone https://github.com/scardbypass/SUPER-BOT.git
cd SUPER-BOT
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

# V2 Promotion
PROMO_DELAY_MS=10000
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
pm2 stop SUPER-BOT
rm -rf sessions
mkdir -p sessions
npm start
```

Setelah berhasil login, hentikan proses foreground dengan <kbd>Ctrl</kbd> + <kbd>C</kbd>, lalu jalankan melalui PM2.

---

# ♾️ Menjalankan 24/7 dengan PM2

```bash
cd /root/SUPER-BOT
pm2 start index.js --name SUPER-BOT
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
pm2 logs SUPER-BOT
pm2 restart SUPER-BOT
pm2 stop SUPER-BOT
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

# 📣 V2 — Promosi WhatsApp

Fitur promosi V2 menggunakan daftar `promoSubscribers` yang tersimpan di database bot. Pengiriman dilakukan **satu per satu ke private chat** dan default memiliki jeda **10 detik per penerima**.

### Kelola subscriber

```text
/promosiadd 628xxxxxxxxxx
/promosidel 628xxxxxxxxxx
/promosilist
```

Penerima dapat berhenti menggunakan:

```text
/stop
```

### Kirim text

```text
/promosi Promo spesial hari ini 🔥
Diskon sampai 20%!
```

### Kirim foto atau video + text

Reply foto/video yang ingin dikirim, kemudian jalankan:

```text
/promosi Promo spesial hari ini 🔥
```

Bot mempertahankan media dan menggunakan teks command/caption sebagai caption promosi.

Saat dimulai, bot menampilkan jumlah penerima, delay, waktu mulai, dan estimasi selesai. Setelah seluruh pengiriman selesai, bot menampilkan total berhasil/gagal, waktu selesai, dan durasi aktual.

Default delay:

```env
PROMO_DELAY_MS=10000
```

Nilai menggunakan milidetik; `10000` berarti 10 detik.

## 📦 Export subscriber dengan /importwa

Jalankan dari **private chat owner**:

```text
/importwa
```

Bot mengirim file `promo-subscribers.json` berisi nomor subscriber yang tersimpan, sudah dideduplikasi dan diurutkan. Contoh:

```json
{
  "exportedAt": "2026-09-30T07:30:12.000Z",
  "total": 2,
  "numbers": [
    "628123456789",
    "628133456789"
  ]
}
```

`/importwa` bersifat **owner-only** dan harus dijalankan dari private chat bot.

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
│   ├── importwa.js
│   ├── menu.js
│   ├── monitor.js
│   ├── promosi.js
│   ├── promosiSubscriber.js
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

# 🔄 Update SUPER-BOT V2

```bash
cd /root/SUPER-BOT
git checkout v2
git pull origin v2
npm install
pm2 restart SUPER-BOT
```

`npm install` penting jika update membawa dependency baru.

---

# 🛠️ Troubleshooting

<details>
<summary><b>Bot tidak membalas command</b></summary>

Cek log:

```bash
pm2 logs SUPER-BOT
```

Pastikan command memang PUBLIC atau nomor sudah terdaftar. Command owner hanya bekerja untuk `OWNER_NUMBER` / role owner.

</details>

<details>
<summary><b>QR / pairing tidak muncul</b></summary>

Jika ingin login ulang:

```bash
pm2 stop SUPER-BOT
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
sudo apt install -y python3-venv\npython3 -m venv /opt/yt-dlp-venv\n/opt/yt-dlp-venv/bin/pip install -U "yt-dlp[default]"
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
pm2 restart SUPER-BOT
```

Jika PM2 mempertahankan environment lama, gunakan:

```bash
pm2 restart SUPER-BOT --update-env
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

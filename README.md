# SCARD-BOT

WhatsApp bot modular dengan Baileys, pairing code, database JSON, provider balance, Gemini AI, sticker, view-once recovery, dan auto voting badminton.

## Install
```bash
cp .env.example .env
nano .env
npm install
npm start
```

## Akses
- Semua plugin default membutuhkan user terdaftar di `database/database.json`; jika tidak terdaftar bot diam.
- `/stiker`, `/sticker`, `/s` bersifat publik.
- `/lihat` hanya user terdaftar.
- `/aion`, `/aioff`, `/aistatus`, `/airbot`, `/ceir deposit`, `/saldoceir` khusus owner.
- AI: private chat user terdaftar langsung dijawab saat ON; grup hanya mention/reply bot.

## Plugin
`/menu`, `/akun`, `/groupinfo`, `/airbot <nominal>`, `/ceir deposit`, `/saldoceir`, `/lihat`, `/stiker`, `/aion`, `/aioff`, `/aistatus`.

Auto voting dikirim ke `VOTING_GROUP_ID` Minggu dan Kamis pukul 10:00 sesuai `TIMEZONE`, dengan pilihan `🏸 GAS` dan `😁 IZIN`.

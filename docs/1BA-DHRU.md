# CUAN-BOT — Layanan 1BA (operator) dan DHRU

## Ringkasan
1BA menggunakan alur operator seperti 3B, **bukan** DigiPOS 1B maupun API langsung 1BD. Order WhatsApp dan DHRU berbagi IMEI Center, status, harga, dan invoice.

| Layanan | ID DHRU | Alur |
|---|---:|---|
| 3B | 101 | Operator |
| 1B | 102 | DigiPOS |
| 3BS | 103 | Operator |
| 3BD | 104 | Operator |
| 1BA | 106 | Operator |

**Catatan:** 1BD direncanakan ID 105 tetapi tidak tercantum dalam `lib/dhruServer.js` pada saat dokumen ini dibuat. Jangan menyatakan 1BD tersedia di katalog DHRU tanpa memeriksa implementasinya.

## Setup
1. Deploy file dari branch `v2`: `lib/imeiCenter/core.js`, `lib/imeiCenter/store.js`, `lib/dhruServer.js`, `plugins/imei1ba.js`, dan `plugins/grupset.js`.
2. Di **grup operator**, owner menjalankan `/1ba operator set`.
3. Di grup seller, owner mengatur harga dengan `/grupset ID_GRUP 1ba 90000` (nominal contoh, sesuaikan).
4. Periksa `/grupinfo`; baris 1BA menampilkan harga dan BUKA/TUTUP. BUKA bergantung pada pengaturan seller/global, jam operasional, dan invoice lock.
5. Kirim `/1ba status` sebagai owner untuk memeriksa pengaturan. Untuk order, gunakan `/1ba IMEI_15_DIGIT`.

## Alur transaksi
- Validasi IMEI 15 digit, seller terdaftar, izin layanan, harga, dan grup operator.
- CEIR diperiksa; hanya `UNKNOWN` dilanjutkan ke operator. Status lain ditolak sesuai aturan IMEI Center.
- Operator menerima order dan menentukan hasil. Jangan menganggap order sukses sebelum ada konfirmasi.
- Order sukses masuk tagihan seller sesuai pengaturan wallet dan invoice. Pembayaran sebagian menyisakan tagihan untuk periode berikutnya.
- Ketika invoice lock aktif, order baru diblokir hingga pelunasan; pengaturan layanan yang dimatikan manual tidak boleh diaktifkan otomatis.

## DHRU
Endpoint menggunakan konfigurasi `DHRU_PUBLIC_URL` dan autentikasi akun API yang sudah terdaftar. Layanan 1BA dipetakan ke **Service ID 106**:
- `imeiservicelist`: tampil hanya jika grup seller dan operator 1BA valid, harga positif, serta layanan tersedia.
- `placeimeiorder`: kirim IMEI dan `SERVICEID=106` menggunakan format parameter yang didukung server DHRU. Respons awal belum berarti SUCCESS.
- `orderstatus` / `orderstatusbulk`: baca status order tersimpan, jangan membuat order baru.

## Validasi aman
```bash
cd /root/scardproject
node --check lib/imeiCenter/core.js
node --check lib/imeiCenter/store.js
node --check lib/dhruServer.js
node --check plugins/imei1ba.js
node --check plugins/grupset.js
node tests/imei-center.test.js
```
Backup `database/imei-center.json` sebelum deploy. Jangan menguji `placeimeiorder` dengan IMEI produksi sebelum katalog, akses seller, operator, dan status diverifikasi. Restart hanya PM2 `scardproject` setelah tes lolos.

## Pemecahan masalah
- **1BA tidak muncul di grupinfo**: perbarui `plugins/grupset.js`, cek harga grup dan `invoiceLock`.
- **1BA TUTUP**: cek `/1ba status`, operator, `/grupinfo`, jam layanan, dan tagihan belum lunas.
- **1BA tidak muncul di DHRU**: cek seller API, grup operator 1BA, harga positif, serta sinkronisasi `lib/dhruServer.js`.
- **`invoiceLocked is not a function`**: pastikan `lib/imeiCenter/store.js` yang berjalan mengekspor fungsi tersebut.

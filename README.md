# MustikaPay Integration Testing App

Aplikasi testing integrasi Payment Gateway **MustikaPay** berbasis TypeScript, Express, dan React (Tailwind CSS) yang kini ditenagai oleh **SDK resmi `mustikapay-node` (^1.4.1)**. Dibuat khusus untuk pengujian alur pembuatan QRIS, pengecekan status transaksi, dan penerimaan webhook dengan verifikasi signature HMAC-SHA256.

```bash
npm install mustikapay-node
```

---

## 1. Persiapan & Konfigurasi (`.env.local`)

Salin file `.env.example` menjadi `.env.local`:

```bash
cp .env.example .env.local
```

Buka `.env.local` dan masukkan API Key dari dashboard MustikaPay:

```env
MUSTIKAPAY_API_KEY="masukkan_api_key_mustikapay_kamu_di_sini"
```

> **Catatan Keamanan:**
> API key **tidak pernah diekspos ke browser/client**. Semua panggilan ke endpoint `https://mustikapayment.com` dilakukan melalui server-side route handler (`/api/mustikapay/...`).

---

## 2. Menjalankan Aplikasi

Jalankan server development:

```bash
npm run dev
```

Aplikasi akan berjalan di: `http://localhost:3000`

---

## 3. Alur Testing Manual

### Langkah A: Buat QRIS Baru
1. Buka halaman utama `http://localhost:3000`.
2. Masukkan:
   - **Nominal**: minimal Rp 1.000 (sesuai spesifikasi MustikaPay).
   - **Nama Produk**: contoh `Kopi Latte` / `Testing Order`.
   - **Nama Customer**: contoh `Budi Santoso`.
3. Klik tombol **"Bayar dengan QRIS"**.
4. Sistem server akan mengirim request form-urlencoded ke `https://mustikapayment.com/api/v1/create/qris`.
5. Tampilan akan merender:
   - Gambar QR Code (`qr_url`)
   - `ref_no` transaksi (misal `QR1776670534209`)
   - Tombol **"Cek Status"** dan **"Payment Link"**.

---

### Langkah B: Cek Status Transaksi (`/status/[ref_no]`)
1. Klik tombol **"Cek Status"** atau buka tab **Status**.
2. Masukkan `ref_no` transaksi.
3. Klik tombol **"Refresh Status"**.
4. Server memanggil `GET https://mustikapayment.com/api/v1/check/qris?ref_no=<ref_no>` dengan header `X-Api-Key`.
5. Status akan ditampilkan:
   - `pending` (menunggu pembayaran)
   - `success` (jika sudah dibayar, gambar nota dari `receipt_url` akan ditampilkan)
   - `expired` (jika waktu kedaluwarsa habis)

---

### Langkah C: Simulasi Webhook Callback dengan `curl`

MustikaPay mengirim callback webhook ke URL server kamu (misal `/api/webhook/mustikapay`) saat transaksi berhasil dibayar.

#### Syarat Verifikasi Signature:
- Header `X-Signature` adalah **HMAC-SHA256** dari **raw body** menggunakan API Key merchant sebagai secret key.
- Server memverifikasi signature langsung dari buffer mentah (`raw body`) sebelum parsing JSON.

#### Cara Hitung Signature HMAC-SHA256 Manual (Bash / Node.js):

Jika payload disimpan dalam file `payload.json`:
```bash
# Menggunakan openssl:
SIGNATURE=$(openssl dgst -sha256 -hmac "YOUR_MUSTIKAPAY_API_KEY" payload.json | awk '{print $2}')
echo "Signature: $SIGNATURE"
```

Atau menggunakan satu baris Node.js:
```bash
BODY='{"status":"success","service":"QRIS","amount":10000,"reference":"QR1776670534209","timestamp":"2026-04-20 14:36:26","data":{"amount":10000,"net_amount":9930,"issuer":"BCA","payor":"0088123456","ref_no":"QR1776670534209","status":"SUCCESS","type":"QRIS"}}'
KEY="YOUR_MUSTIKAPAY_API_KEY"

SIGNATURE=$(node -e "const crypto=require('crypto'); console.log(crypto.createHmac('sha256', process.env.KEY).update(process.env.BODY).digest('hex'))")
echo "Signature: $SIGNATURE"
```

#### Perintah `curl` Lengkap untuk Simulasi:

```bash
curl -X POST http://localhost:3000/api/webhook/mustikapay \
  -H "Content-Type: application/json" \
  -H "X-Signature: <SIGNATURE_HASIL_DIATAS>" \
  -d '{
    "status": "success",
    "service": "QRIS",
    "amount": 10000,
    "reference": "QR1776670534209",
    "order_id": null,
    "timestamp": "2026-04-20 14:36:26",
    "data": {
      "amount": 10000,
      "net_amount": 9930,
      "issuer": "BCA",
      "payor": "0088123456",
      "ref_no": "QR1776670534209",
      "status": "SUCCESS",
      "type": "QRIS",
      "receipt_url": "https://mustikapayment.com/receipt/sample.png"
    }
  }'
```

> **Tips:** Di dalam aplikasi web ini sudah disediakan tab **"Webhook Tester"** yang secara otomatis menghitung `X-Signature` real-time dan memiliki tombol **"Kirim Simulasi Sekarang"** 1-klik untuk memudahkan testing tanpa perlu terminal!

---

## 4. Struktur Endpoint Server

| Endpoint | Method | Format Body | Keterangan |
|---|---|---|---|
| `/api/mustikapay/create-qris` | `POST` | `application/json` (internal) -> `x-www-form-urlencoded` ke MustikaPay | Membuat invoice QRIS ke MustikaPay |
| `/api/mustikapay/check-status` | `GET` | Query param `?ref_no=...` | Mengambil status transaksi terkini dari MustikaPay |
| `/api/webhook/mustikapay` | `POST` | `application/json` dengan header `X-Signature` | Menerima & memverifikasi webhook callback dari MustikaPay |
| `/api/transactions` | `GET` | - | Mengambil daftar riwayat transaksi di memori |
| `/api/webhook/logs` | `GET` | - | Mengambil log webhook yang masuk untuk inspeksi |
| `/api/webhook/simulate-test` | `POST` | `application/json` | Menghitung signature & menguji webhook simulasi |

---

## 5. Catatan Teknis & Produksi

1. **Format Request MustikaPay**:
   - Endpoint create QRIS/VA: `application/x-www-form-urlencoded`
   - Endpoint webhook callback: `application/json`
2. **Minimal Nominal**:
   - Nominal minimum QRIS adalah Rp 1.000.
3. **Persyaratan Hosting Produksi MustikaPay**:
   - Untuk deployment produksi, MustikaPay mewajibkan domain sendiri dengan IP tetap dan menolak shared platform gratis (seperti Vercel/Railway) untuk webhook callback API. Untuk pengujian lokal gunakan `localhost` atau tunnel seperti `ngrok`.

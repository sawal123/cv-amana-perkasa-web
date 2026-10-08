# Production Deployment — CV AMANA PERKASA

Panduan rilis nyata ke **cPanel + Node.js Selector (CloudLinux + Phusion Passenger)**.
Arsitektur deployment **tidak berubah**: `output: "standalone"`, startup file
`cpanel/server.js`, MySQL/MariaDB. Dokumen ini menggantikan langkah-langkah deploy
versi lama di README.

> Prinsip utama: **database produksi adalah data nyata.** Jangan pernah
> menjalankan ulang seed konten di database yang sudah berjalan.

---

## 0. Ringkasan alur

```
domain + SSL + Force HTTPS
        ↓
build lokal  →  production:preflight
        ↓
backup DB + backup public/uploads + catat SHA rilis
        ↓
database: instalasi baru? import-all.sql  |  update? migrate-all.sql
        ↓
deploy:pack  →  deploy:verify
        ↓
upload + extract ke app root cPanel
        ↓
Setup Node.js App + Environment Variables  →  restart
        ↓
/health check  →  smoke test  →  uji manual
```

---

## 1. Domain & DNS

- Arahkan domain ke server cPanel (A record / nameserver).
- Tunggu propagasi DNS sebelum meminta SSL.

## 2. SSL / AutoSSL

- cPanel → **SSL/TLS Status** → jalankan **AutoSSL**.
- Pastikan status domain **valid** sebelum rilis.

## 3. Force HTTPS

- Aktifkan **Force HTTPS Redirect** (cPanel → Domains).
- Jangan menonaktifkan secure cookie sebagai jalan pintas HTTP. Session admin
  memakai cookie `secure` di produksi; situs **harus** HTTPS.

## 4. Versi Node.js

- Next 16 membutuhkan **Node >= 20.9**. Pilih **20.x** atau **22.x** di
  **Setup Node.js App → Node.js version**.
- Bila hanya tersedia 18.x ke bawah, shared hosting ini tidak viable.

---

## 5. Build & preflight (di mesin lokal)

```bash
npm install
npm run production:preflight     # cek env TANPA menyentuh database
npm run build
npm run deploy:pack              # .next → ./deploy, lalu otomatis deploy:verify
```

`production:preflight` memeriksa Node >= 20.9, `DATABASE_URL`, `AUTH_SECRET`
(>= 32), `SITE_URL` (valid + https untuk produksi). Tidak pernah menampilkan
nilai rahasia.

---

## 6. Backup wajib SEBELUM update apa pun

Untuk setiap pembaruan skema di database produksi yang sudah berjalan:

1. **Export database** lewat phpMyAdmin (Export → SQL):
   `amana-db-YYYYMMDD-HHMM.sql`
2. **Backup upload:**
   `amana-uploads-YYYYMMDD-HHMM.zip` (isi `public/uploads`)
3. **Catat SHA rilis** yang sedang berjalan:
   ```bash
   git rev-parse HEAD
   ```

Tanpa ketiganya, **jangan** lanjut. Rollback hanya mungkin bila backup ada.

---

## 7. Database: instalasi baru vs update

### Instalasi baru (database kosong)

Gunakan:

```
drizzle/import-all.sql
```

Berisi **seluruh migrasi + konten awal**. Aman diimpor berulang pada database
baru.

- phpMyAdmin → pilih database → **Import** → `drizzle/import-all.sql`.
- Setelah itu buat admin pertama dengan `npm run db:seed` (lihat §8).

### Update database produksi yang sudah berjalan

Gunakan:

```
drizzle/migrate-all.sql
```

Berisi **seluruh migrasi, tanpa konten awal, tanpa kredensial admin**.

- Hanya struktur yang diperbarui; konten produksi tidak tersentuh.
- **Jangan** gunakan `import-all.sql` untuk update rutin: `INSERT IGNORE` dapat
  menghidupkan kembali baris default yang sengaja dihapus admin (mis. project
  id=1 yang sudah dihapus akan dibuat ulang).
- Bila punya akses MySQL langsung, jalur lokal `npm run db:migrate` setara —
  sekarang **migration-only** (tidak lagi menerapkan seed).

Kedua file dihasilkan oleh `npm run db:seed:sql`, dari sumber yang sama
(`drizzle/000X_*.sql`), jadi tidak ada logika transformasi yang terduplikasi.

### Keamanan `db:seed`

```bash
npm run db:seed
```

adalah operasi **bootstrap / seed yang disengaja**, bukan langkah migrasi biasa.
Jalankan **hanya** saat membuat admin pertama atau ketika memang ingin
menanamkan konten awal. Untuk update produksi rutin, gunakan `migrate-all.sql`
atau `npm run db:migrate`.

---

## 8. Membuat admin pertama

`import-all.sql` sengaja **tidak** memuat kredensial. Buat admin dari
environment:

```bash
# Dari mesin lokal dengan DATABASE_URL menunjuk database produksi
# (aktifkan Remote MySQL di cPanel untuk IP Anda), dan ADMIN_USERNAME /
# ADMIN_PASSWORD sudah diisi di .env:
npm run db:seed
```

Perintah ini juga melakukan UPSERT admin, jadi menjalankannya ulang sekaligus
berfungsi sebagai reset password. Bila Remote MySQL tidak tersedia, jalankan
perintah yang sama di server lewat SSH (butuh `tsx`, yang tidak ikut di artefak
standalone).

---

## 9. Artefak deploy

```bash
npm run build
npm run deploy:pack      # = scripts/pack.mjs + scripts/deploy-verify.mjs
```

`deploy:pack` menyusun `./deploy` berisi standalone bundle, `.next/static`,
`public/`, `public/uploads` (dilestarikan), `server.js` (Passenger), dan
`drizzle/`, lalu menghapus `.env`/`.env.local`.

`deploy:verify` memastikan artefak memuat `server.js`, `.next/`, `.next/static/`,
`public/`, `public/uploads/`, `drizzle/import-all.sql`, `drizzle/migrate-all.sql`;
**tidak** memuat `.env*`/kunci rahasia; dan startup file benar-benar
`cpanel/server.js` (bukan `server.js` default Next standalone).

Zip **isi** folder `deploy` (bukan foldernya).

---

## 10. Upload & extract di cPanel

- Upload zip lewat File Manager, extract ke app root, mis. `public_html/amana`.
- Timpa berkas lama, **kecuali** `public/uploads` — jangan pernah `rm -rf`
  `public/uploads` di server.

## 11. Setup Node.js App

**cPanel → Setup Node.js App → Create Application**:

| Kolom | Isi |
|---|---|
| Node.js version | 20.x / 22.x |
| Application mode | Production |
| Application root | `public_html/amana` |
| Application URL | domain kamu, path kosong |
| Application startup file | `server.js` |

## 12. Environment variables

Isi di **Setup Node.js App → Environment Variables** (bukan di dalam file build):

```
NODE_ENV=production
DATABASE_URL=mysql://USER:PASS@127.0.0.1:3306/namacpanel_amana_cms
AUTH_SECRET=<openssl rand -base64 48>
SITE_URL=https://domain-produksi.com
```

`SITE_URL` adalah **origin deployment** (bukan field konten): URL absolut
http/https, produksi wajib https, dan **wajib origin saja** — tanpa path, query,
hash, atau kredensial. Nilai seperti `https://example.com/amana` **ditolak**
(bukan dipotong diam-diam): preflight `FAIL` dan `/api/health` `degraded`,
karena robots/sitemap/canonical/JSON-LD harus memakai origin yang sama persis
dengan yang ditulis operator.

## 13. Restart

**STOP APP → START APP**. Restart menyebabkan 503 sementara 10–20 detik saat cold
start — jangan restart saat ada klien membuka situs.

## 14. Health check

```
GET /api/health
```

- `200 {"status":"ok"}` bila: `AUTH_SECRET` >= 32, `SITE_URL` valid (https),
  database terjangkau, skema lengkap, `public/uploads` writable.
- `503` bila belum siap (`status: "degraded"`).

Endpoint ini read-only, tanpa auth, `Cache-Control: no-store`, `X-Robots-Tag:
noindex, nofollow`, dan tidak pernah menampilkan nilai rahasia.

## 15. Smoke check

```bash
node scripts/production-smoke.mjs https://domain-produksi.com
# atau
npm run production:smoke -- https://domain-produksi.com
```

Read-only (tanpa login, tanpa submit). Memverifikasi status `/`, `/robots.txt`,
`/sitemap.xml`, `/api/health`, `/admin/login`, 404; tag SEO + JSON-LD; isi
robots/sitemap; dan security header.

---

## 16. Uji manual pascadeploy

1. Buka homepage di jendela **incognito**.
2. Periksa `<title>` dan `canonical` (View Source).
3. Buka `/robots.txt` — pastikan `Allow: /`, `Disallow: /admin/`, `Disallow: /api/`, dan Sitemap.
4. Buka `/sitemap.xml` — hanya homepage produksi.
5. Buka `/api/health` — 200.
6. Buka `/admin`.
7. Login.
8. Ubah satu field teks yang tidak berisiko, simpan.
9. Konfirmasi perubahan muncul di homepage.
10. Unggah satu gambar uji lewat Media.
11. **Restart app**, konfirmasi gambar uji masih tersaji (persistensi upload).
12. Kirim satu **lead uji** lewat form penawaran (beri label jelas, mis. "TEST DELETE ME").
13. Konfirmasi lead muncul di **Permintaan Penawaran**.
14. Ubah status lead tersebut.
15. Hapus lead uji **hanya bila ada fitur hapus** — saat ini tidak ada, jadi biarkan
    sebagai lead uji berlabel. Jangan menambah fitur hapus hanya untuk ini.

---

## 17. Checklist konten go-live

Ganti seluruh konten contoh sebelum publikasi (lihat juga `npm run content:check`):

- nomor telepon asli
- email asli
- alamat asli
- nomor WhatsApp asli
- nama manajemen asli
- logo perusahaan (bila ada)
- gambar & data project asli (bukan visual konsep bawaan `/projects/*`)
- legalitas asli
- SEO title, SEO description, canonical, OG image

Jangan mengarang nilai pengganti secara otomatis.

---

## 18. Persistensi upload

`deploy:pack` melestarikan `./deploy/public/uploads` **di mesin lokal**. Itu
**tidak** mem-backup upload produksi di server sebelum penggantian manual.

- **Sebelum** deploy: backup `public/uploads` produksi.
- **Saat** deploy: jangan pernah `rm -rf public/uploads` di server.
- **Setelah** deploy: pastikan satu gambar lama masih HTTP 200, lalu satu upload
  baru berhasil.

---

## 19. Rollback runbook

Pegang selalu: SHA commit rilis sebelumnya, zip deploy sebelumnya, backup
database, backup uploads.

**Aplikasi gagal, migrasi bersifat aditif & backward-compatible:**
1. Kembalikan berkas aplikasi ke rilis sebelumnya (extract zip lama, timpa).
2. Biarkan database apa adanya (kolom/tabel tambahan tidak mengganggu rilis lama).
3. Restart app, jalankan smoke.

**Database/data rusak:**
1. Restore backup database (`amana-db-*.sql`).
2. Restore `public/uploads` bila perlu.
3. Kembalikan berkas aplikasi ke rilis sebelumnya.
4. Restart, verifikasi.

Jangan pernah membalik migrasi SQL secara manual/buta.

---

## 20. Catatan hardening lanjutan (belum termasuk rilis ini)

- **CSP**: belum ditambahkan. CSP yang buruk lebih berbahaya daripada tanpa CSP;
  implementasi nonce perlu diuji menyeluruh. (FOLLOW-UP)
- **Rate limiting**: tidak ada limiter in-memory (Passenger bisa multi-proses dan
  itu menyesatkan). Gunakan rate limiting di lapisan **Cloudflare / cPanel / WAF**.
  Honeypot form penawaran tetap aktif.
- **Reset password admin terpisah**: saat ini hanya lewat `npm run db:seed`
  (UPSERT). Tooling reset khusus = FOLLOW-UP.

---

## 21. Release Go / No-Go

**GO** hanya bila seluruhnya terpenuhi:

```
[ ] typecheck PASS
[ ] build PASS
[ ] integration PASS
[ ] e2e PASS
[ ] import-all PASS
[ ] migrate-all PASS
[ ] deploy verify PASS
[ ] production smoke PASS
[ ] /api/health 200
[ ] HTTPS aktif (AutoSSL + Force HTTPS)
[ ] backup DB selesai
[ ] backup uploads selesai
[ ] konten placeholder sudah diganti
[ ] admin login berhasil
[ ] form penawaran berfungsi
[ ] upload media berfungsi
[ ] canonical benar
[ ] robots benar
[ ] sitemap benar
```

Bila ada pemeriksaan kritis gagal: **RELEASE DECISION = BLOCKED**.

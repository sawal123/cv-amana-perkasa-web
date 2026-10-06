# CV AMANA PERKASA — Company Profile + CMS

Website company profile event service dengan **CMS sendiri**: Next.js 16, React 19,
Tailwind CSS 4, Motion, TypeScript, dan **MySQL**. Seluruh konten situs diedit lewat
panel admin di `/admin` — tidak ada project API terpisah.

## Stack

| Lapisan | Pilihan | Alasan |
|---|---|---|
| Framework | Next.js 16 (App Router, `output: "standalone"`) | Frontend + backend dalam satu repo |
| Database | MySQL / MariaDB | Sudah tersedia di shared hosting cPanel |
| ORM | Drizzle ORM + `mysql2` | Pure JS, tanpa kompilasi native di server |
| Auth | JWT (`jose`) di cookie httpOnly + scrypt | Stateless — Passenger bisa menjalankan banyak proses |
| Validasi | zod | Satu schema untuk form dan server |
| Deploy | cPanel Node.js Selector (CloudLinux + Phusion Passenger) | Target utama |

## Perubahan penting dari versi sebelumnya

Versi lama memakai `output: "export"` (HTML statis murni, konten di `data/site.ts`).
Sekarang project ini **butuh server Node** — `output: "export"` sudah diganti
menjadi `"standalone"`. Konsekuensinya host harus menyediakan runtime Node.js
(lihat [Fase 0](#fase-0-pastikan-host-sanggup) di bawah).

## Menjalankan lokal

Butuh Node **20.9+** dan MySQL/MariaDB yang bisa diakses.

```bash
npm install
cp .env.example .env      # isi DATABASE_URL, AUTH_SECRET, ADMIN_PASSWORD
npm run db:migrate        # buat tabel dari drizzle/*.sql
npm run db:seed           # isi konten default + buat user admin pertama
npm run dev               # http://localhost:3000
```

`AUTH_SECRET` wajib minimal 32 karakter:

```bash
openssl rand -base64 48
```

Bila MySQL belum ada, situs **tetap jalan normal** — otomatis jatuh ke konten
bawaan di `data/site.json` (lihat bagian Fallback).

## Environment variables

| Variabel | Keterangan |
|---|---|
| `DATABASE_URL` | `mysql://user:pass@127.0.0.1:3306/nama_db`. Di cPanel pakai `127.0.0.1`, bukan `localhost` |
| `AUTH_SECRET` | Kunci sign session. Minimal 32 karakter |
| `ADMIN_USERNAME` | Hanya dipakai `db:seed` untuk membuat user pertama (default `admin`) |
| `ADMIN_PASSWORD` | Hanya dipakai `db:seed`. Minimal 8 karakter |

## Panel admin

Akses di `/admin`, login dengan `ADMIN_USERNAME` / `ADMIN_PASSWORD` dari seed.

- **Settings** — identitas, hero, tentang (termasuk statistik), teks tiap seksi,
  kontak (telepon, email, WhatsApp, alamat, Instagram), dan **SEO & meta**
  (judul, description, keywords, OG image, URL kanonis)
- **Layanan / Project / Tim & Management / Workflow** — CRUD penuh: tambah, ubah,
  hapus, urut naik-turun, dan sembunyikan tanpa menghapus baris
- **Media** — unggah gambar (JPG/PNG/WEBP, maks 4 MB), dipakai lewat dropdown
  di form Project dan Tim

Urutan baris di admin sama persis dengan urutan tampil di situs.

## Arsitektur konten

```
lib/db/schema.ts        definisi tabel MySQL
lib/db/index.ts         connection pool (lazy, connectionLimit 3)
lib/admin/fields.ts     registry kolom konten → form admin + validasi
lib/admin/settings-fields.ts  registry field Settings
lib/content.ts          loadContent() / loadSettings()  ← inti seluruh sistem
data/site.json          konten bawaan + fallback
components/site-shell.tsx   terima prop `content`, tidak impor data langsung
```

`settings` disimpan key/value sebagai JSON per grup (`identity`, `hero`, `about`,
`contact`, `seo`, …). Menambah field baru tidak butuh migrasi: field yang tidak ada
di database otomatis memakai nilai dari `data/site.json`.

### Fallback

`loadContent()` hanya memakai database bila **terhubung dan sudah ter-seed**. Kalau
koneksi gagal, `DATABASE_URL` kosong, atau tabel masih kosong, situs menampilkan
konten bawaan dari `data/site.json` — bukan halaman error. Setelah database ter-seed,
semua yang kamu edit di admin berlaku penuh, termasuk menghapus seluruh project
(portfolio benar-benar kosong, tidak kembali ke template).

## Deploy ke cPanel

### Fase 0 — pastikan host sanggup

Buka **cPanel → Setup Node.js App**, lihat dropdown *Node.js version*:

| Versi tersedia | Keputusan |
|---|---|
| 20.x atau 22.x | Lanjut, Next 16 aman |
| tertinggi 18.x | Turunkan ke Next 15 (`engines` Next 15 = Node ≥ 18.18), sisanya sama |
| tertinggi 16.x, atau ikon tidak ada | Shared hosting tidak viable. Pakai Vercel atau VPS |

Next 16 menyatakan `"engines": { "node": ">=20.9.0" }`.

### Langkah

1. **Build di mesin lokal** (jangan di server — build `next build` akan OOM di
   batas memori shared hosting):

   ```bash
   npm run build
   npm run deploy:pack      # hasil di ./deploy, ± 52 MB
   ```

2. Zip **isi** folder `deploy` (bukan foldernya), upload lewat File Manager,
   extract ke mis. `public_html/amana`.

3. Buat database di **cPanel → MySQL® Databases**, catat nama lengkapnya
   (mis. `namacpanel_amana_cms`).

4. Import skema + konten: **phpMyAdmin → pilih DB → Import → `drizzle/import-all.sql`**.
   Satu file itu berisi skema dan seed, dan aman diimpor berulang.

5. **Setup Node.js App → Create Application**:

   | Kolom | Isi |
   |---|---|
   | Node.js version | 20.x / 22.x |
   | Application mode | Production |
   | Application root | `public_html/amana` |
   | Application URL | domain kamu, path kosong |
   | Application startup file | `server.js` |

6. Isi **Environment Variables**: `NODE_ENV=production`, `DATABASE_URL`,
   `AUTH_SECRET`. Lalu **Create → STOP APP → START APP**.

7. Buka `/admin`, login, ganti satu field, cek homepage berubah.

### Yang perlu diketahui soal cPanel

- **`server.js` wajib custom.** Passenger tidak mengenal `next start`; ia men-*patch*
  `http.Server.prototype.listen`. Berkasnya ada di `cpanel/server.js` dan sudah
  disalin `deploy:pack` ke root artefak. Port dibaca dari `process.env.PORT`.
- **Restart = 503 sementara** 10–20 detik saat cold start. Jangan restart saat
  ada klien membuka situs.
- **Image optimization mati** (`images.unoptimized: true`). Butuh `sharp`, yaitu
  binary native yang tidak bisa dikompilasi di shared hosting.
- **Tidak ada ISR.** Semua halaman `force-dynamic`, jadi edit admin langsung tampil.
  Konsekuensinya tiap kunjungan menyentuh MySQL — untuk situs company profile ini
  tidak masalah, dan yang pertama diubah bila traffic naik adalah menambah cache di
  `lib/content.ts`.
- **Upload tidak hilang saat redeploy.** `deploy:pack` melestarikan
  `deploy/public/uploads`. Di server, jangan hapus folder `public/uploads` saat
  menimpa hasil build baru — MySQL tetap menunjuk berkasnya.
- **Pastikan `public/uploads` dan `.next/cache` writable** oleh user cPanel.
- **Jangan jalankan `next dev` dan `next build` bersamaan** pada satu direktori;
  keduanya berbagi `.next/cache`.
- WebSocket dan long-polling umumnya tidak jalan di Passenger. Tidak dipakai di sini.

### Pindah ke Vercel nanti

Hanya `lib/db/index.ts` yang berubah — ganti driver `mysql2` menjadi
`drizzle-orm/@tidbcloud/serverless` (koneksi HTTP, karena function serverless tidak
bisa menahan connection pool ke MySQL biasa). Skema, seluruh query, dan semua halaman
admin tidak tersentuh. Gambar perlu pindah ke object storage (Vercel Blob / R2),
karena filesystem serverless bersifat ephemeral.

## Perintah

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Build produksi (standalone) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:generate` | Generate SQL migrasi dari `lib/db/schema.ts` |
| `npm run db:migrate` | Terapkan `drizzle/*.sql` ke `DATABASE_URL` |
| `npm run db:seed` | Isi konten + buat admin (butuh `ADMIN_PASSWORD`) |
| `npm run db:seed:sql` | Tulis `drizzle/seed-data.sql` + `drizzle/import-all.sql` untuk phpMyAdmin |
| `npm run deploy:pack` | Susun artefak upload di `./deploy` |

## Tes

Dua rangkaian, keduanya butuh MySQL sungguhan.

```bash
npm run build && npm run deploy:pack
(cd deploy && set PORT=3355&& set NODE_ENV=production&& node --env-file=..\.env server.js)

npx tsx --env-file=.env scripts/integration-check.ts     # CRUD, upload, hashing, charset
node --env-file=.env scripts/e2e-check.mjs http://localhost:3355   # HTTP + auth + fallback
```

- `integration-check.ts` — kredensial seed, CRUD konten (insert/urut/sembunyikan/hapus,
  posisi tetap rapat), validasi upload (tolak `.php`, `.exe`, >4 MB, 0 byte, PNG
  menyamar), referensi media yang ditolak saat dihapus, dan round-trip utf8mb4.
- `e2e-check.mjs` — halaman publik benar-benar dibaca dari MySQL, gambar upload
  tersaji, guard path traversal, dan `/admin` menolak anonim/token palsu/token
  kedaluwarsa sambil menerima sesi sah.

Keduanya mengubah database lalu mengembalikannya ke semula (snapshot diambil
sebelum mutasi).

## Catatan keamanan

- Password di-hash **scrypt** (N=16384, salt acak per user) dari `node:crypto` —
  bukan bcrypt/argon2, karena tidak perlu kompilasi native di server.
- Perbandingan hash pakai `timingSafeEqual`.
- Session JWT httpOnly, `sameSite=lax`, `secure` di produksi. Tidak ada state di
  memori, jadi aman di Passenger multi-proses.
- Upload: tipe ditentukan dari **magic bytes** (bukan `file.type`), nama file
  dari `randomUUID()` server — `file.name` klien tidak pernah dipakai untuk path,
  dan tujuan diverifikasi tetap di dalam `public/uploads`.
- Nama tabel dan kolom hanya berasal dari registry di `lib/admin/fields.ts`,
  tidak pernah dari request.
- `/admin` di-`noindex`, dan pesan login sengaja seragam untuk username salah
  maupun password salah.

## Berkas konten

`data/site.json` = konten bawaan sekaligus fallback. `data/site.ts` hanya membungkusnya
dengan tipe. Untuk mengubah tampilan awal sebelum seed pertama, edit JSON itu lalu
jalankan `npm run db:seed:sql` dan impor ulang.

Gambar portfolio bawaan ada di `public/projects/` dan masih berupa visual konsep
sementara — ganti dengan dokumentasi project asli (lewat panel admin) sebelum
publikasi resmi.

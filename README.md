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
cp .env.example .env      # isi DATABASE_URL, AUTH_SECRET, ADMIN_PASSWORD, SITE_URL
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
| `SITE_URL` | Origin deployment (`https://amanaperkasa.co.id`). Dasar canonical, `robots.txt`, `sitemap.xml`, dan JSON-LD. Produksi wajib https |
| `DATABASE_URL` | `mysql://user:pass@127.0.0.1:3306/nama_db`. Di cPanel pakai `127.0.0.1`, bukan `localhost` |
| `AUTH_SECRET` | Kunci sign session. Minimal 32 karakter |
| `ADMIN_USERNAME` | Hanya dipakai `db:seed` untuk membuat user pertama (default `admin`) |
| `ADMIN_PASSWORD` | Hanya dipakai `db:seed`. Minimal 8 karakter |

## Panel admin

Akses di `/admin`, login dengan `ADMIN_USERNAME` / `ADMIN_PASSWORD` dari seed.

- **Settings** — identitas, hero, tentang (termasuk statistik), teks tiap seksi,
  kontak (telepon, email, WhatsApp, alamat, Instagram), dan **SEO & meta**
  (judul, description, keywords, OG image, URL kanonis — URL kanonis divalidasi
  sebagai alamat absolut http/https)
- **Layanan / Project / Tim & Management / Workflow / Legalitas / Keunggulan /
  Clients & Partners / Testimonials** — CRUD penuh: tambah, ubah, hapus, urut
  naik-turun, dan sembunyikan tanpa menghapus baris
- **Permintaan Penawaran** — daftar lead dari form publik; lihat detail, buka
  tautan WhatsApp ternormalisasi, dan ubah status (`Baru`, `Sudah Dihubungi`,
  `Penawaran Dikirim`, `Selesai`). Tidak ada fitur hapus — data lead bersifat
  arsip
- **Galeri project** — tombol **Galeri** pada setiap baris di daftar Project.
  Tambah beberapa foto dari pustaka media, isi caption opsional, atur urutan
  dengan ↑ ↓, dan hapus. Gambar cover diatur di form Project, bukan di sini
- **Media** — unggah gambar (JPG/PNG/WEBP, maks 4 MB), dipakai lewat dropdown
  di form Project, Tim, Galeri, Client, Testimonial, dan Settings

Project juga punya blok **case study** opsional: `Tujuan / Challenge`,
`Pendekatan`, dan `Hasil / Outcome`. Blok ini tampil di modal detail project dan
disembunyikan bila ketiganya kosong.

Urutan baris di admin sama persis dengan urutan tampil di situs.

### Project, metadata, galeri, dan legalitas

Setiap project punya satu **cover** (`projects.image`, thumbnail di grid) dan
**0..N foto galeri** di tabel terpisah `project_images`. Cover tidak pernah
digantikan oleh galeri.

Empat field metadata bersifat opsional — `client`, `location`, `year`, dan
`scope`. Field yang kosong **tidak dirender** di situs, jadi tidak ada label
menggantung. `scope` diisi satu item per baris dan tampil sebagai daftar; kolomnya
`varchar` biasa agar kompatibel dengan MariaDB dan MySQL lama.

Project lama yang hanya punya title/category/image/description tetap tampil normal.

**Legalitas** (`company_legalities`) adalah daftar bebas yang jenisnya ditentukan
admin — tidak ada NIB/NPWP/Akta yang di-hardcode. Judul seksinya diatur di
**Settings → Seksi Legalitas**, dan seluruh seksi disembunyikan bila daftar kosong.

## Arsitektur konten

```
lib/db/schema.ts        definisi tabel MySQL
lib/db/index.ts         connection pool (lazy, connectionLimit 3)
lib/admin/fields.ts     registry kolom konten → form admin + validasi
lib/admin/settings-fields.ts  registry field Settings
lib/admin/store.ts      CRUD generik untuk tabel konten
lib/admin/gallery.ts    galeri per project (tambah/urut/hapus/caption)
lib/content.ts          loadContent() / loadSettings()  ← inti seluruh sistem
data/site.json          konten bawaan + fallback
components/site-shell.tsx   terima prop `content`, tidak impor data langsung
components/project-detail.tsx  modal detail project + galeri + lightbox
```

`settings` disimpan key/value sebagai JSON per grup (`identity`, `hero`, `about`,
`legalities`, `contact`, `seo`, …). Menambah field baru tidak butuh migrasi: field
yang tidak ada di database otomatis memakai nilai dari `data/site.json`.

### Fallback

`loadContent()` hanya memakai database bila **terhubung dan sudah ter-seed**. Kalau
koneksi gagal, `DATABASE_URL` kosong, atau tabel masih kosong, situs menampilkan
konten bawaan dari `data/site.json` — bukan halaman error. Setelah database ter-seed,
semua yang kamu edit di admin berlaku penuh, termasuk menghapus seluruh project
(portfolio benar-benar kosong, tidak kembali ke template).

Galeri dan legalitas tidak memakai mekanisme fallback: keduanya default **kosong**,
dan situs tetap render normal dengan daftar kosong. Project tanpa galeri hanya
kehilangan seksi galerinya, dan legalitas kosong menyembunyikan seluruh seksi.

## Deploy ke cPanel

> Panduan rilis lengkap (SSL, backup, health check, rollback, checklist Go/No-Go)
> ada di [`docs/PRODUCTION_DEPLOYMENT.md`](docs/PRODUCTION_DEPLOYMENT.md). Ringkasan
> langkah ada di bawah ini.

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

4. Import database — pilih sesuai kondisi:

   - **Instalasi baru (database kosong):** import `drizzle/import-all.sql`
     (seluruh migrasi + konten awal).
   - **Database produksi yang sudah berjalan:** import `drizzle/migrate-all.sql`
     (seluruh migrasi, **tanpa** konten). Jangan pakai `import-all.sql` untuk
     update rutin — `INSERT IGNORE` bisa menghidupkan kembali baris default yang
     sengaja dihapus admin. Jalur lokal `npm run db:migrate` kini **migration-only**.

   Kedua file dihasilkan `npm run db:seed:sql` dari sumber yang sama. Rincian
   lengkap: [`docs/PRODUCTION_DEPLOYMENT.md`](docs/PRODUCTION_DEPLOYMENT.md).

5. **Setup Node.js App → Create Application**:

   | Kolom | Isi |
   |---|---|
   | Node.js version | 20.x / 22.x |
   | Application mode | Production |
   | Application root | `public_html/amana` |
   | Application URL | domain kamu, path kosong |
   | Application startup file | `server.js` |

6. Isi **Environment Variables**: `NODE_ENV=production`, `DATABASE_URL`,
   `AUTH_SECRET`, `SITE_URL` (origin produksi, mis.
   `https://amanaperkasa.co.id`). Lalu **Create → STOP APP → START APP**.

7. **Buat admin pertama.** `import-all.sql` sengaja **tidak** memuat kredensial
   apa pun — tidak ada plaintext maupun hash — jadi admin dibuat dari environment:

   ```bash
   # di mesin lokal, dengan DATABASE_URL menunjuk database produksi
   # (aktifkan Remote MySQL di cPanel untuk IP Anda) dan ADMIN_USERNAME /
   # ADMIN_PASSWORD produksi sudah diisi di .env
   npm run db:seed
   ```

   Perintah itu juga mengisi konten (idempoten) dan melakukan UPSERT admin, jadi
   menjalankannya lagi sekaligus berfungsi sebagai reset password admin.

   Bila Remote MySQL tidak tersedia, jalankan perintah yang sama **di server**
   lewat SSH setelah `npm install` — `db:seed` membutuhkan `tsx`, yang tidak ikut
   di dalam artefak standalone.

8. Buka `/admin`, login dengan kredensial dari langkah 7, ganti satu field, cek
   homepage berubah.

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
| `npm run db:migrate` | Terapkan migrasi bernomor (`000X_*.sql`) ke `DATABASE_URL` — **migration-only** |
| `npm run db:seed` | Bootstrap: isi konten awal + buat/update admin dari environment (`ADMIN_PASSWORD`). **Bukan** langkah migrasi rutin |
| `npm run db:seed:sql` | Tulis `drizzle/seed-data.sql`, `drizzle/migrate-all.sql` (migrasi saja), dan `drizzle/import-all.sql` (skema + konten). Tanpa kredensial |
| `npm run production:preflight` | Cek env produksi (read-only, tidak menampilkan rahasia) |
| `npm run deploy:pack` | Susun artefak di `./deploy`, lalu otomatis `deploy:verify` |
| `npm run deploy:verify` | Verifikasi isi artefak `./deploy` |
| `npm run production:smoke -- <url>` | Smoke test read-only ke URL produksi |
| `npm run content:check` | Cek placeholder konten sebelum go-live (read-only) |

## Tes

Semuanya butuh MySQL sungguhan.

```bash
npm run build && npm run deploy:pack
(cd deploy && set PORT=3355&& set NODE_ENV=production&& node --env-file=..\.env server.js)

node --env-file=.env scripts/import-all-check.mjs                    # instalasi baru (import-all)
node --env-file=.env scripts/migrate-all-check.mjs                   # update produksi (migrate-all)
npx tsx --env-file=.env scripts/integration-check.ts                 # CRUD, gallery, upload, SEO, health
node --env-file=.env scripts/e2e-check.mjs http://localhost:3355     # HTTP + auth + fallback
npm run production:smoke -- http://localhost:3355                    # smoke read-only
```

- `import-all-check.mjs` — membuktikan `drizzle/import-all.sql` berhasil pada
  import **pertama**, berhasil lagi pada import **kedua** (tanpa duplikasi),
  memperbaiki database yang baru separuh termigrasi, menghasilkan skema akhir yang
  benar, dan tidak memuat kredensial admin. Sudah diverifikasi di MySQL 8 dan
  MariaDB 10.6.
- `migrate-all-check.mjs` — membuktikan `drizzle/migrate-all.sql` bersifat
  **migration-only**: instalasi baru menghasilkan skema lengkap **tanpa** konten
  awal, aman diimpor berulang, memperbaiki database separuh termigrasi, dan
  **konten produksi tidak tersentuh** — layanan yang diedit, project default yang
  dihapus, lead quotation, client, dan testimonial tetap utuh setelah update.
- `integration-check.ts` — kredensial seed, CRUD konten (insert/urut/sembunyikan/hapus,
  posisi tetap rapat), metadata project, galeri, cascade hapus project, legalitas,
  validasi upload, round-trip utf8mb4, plus parsing URL SEO, validasi canonical,
  keamanan JSON-LD (escape `</script>`), dan pemeriksaan health (config/schema/uploads).
- `e2e-check.mjs` — halaman publik benar-benar dibaca dari MySQL, gambar upload
  tersaji, guard path traversal, metadata/galeri/legalitas sampai ke halaman, dan
  `/admin` menolak anonim/token palsu/token kedaluwarsa sambil menerima sesi sah.
- `production-smoke.mjs` — read-only ke server yang berjalan: status `/`,
  `/robots.txt`, `/sitemap.xml`, `/api/health`, `/admin/login`, 404, tag SEO +
  JSON-LD, isi robots/sitemap, dan security header.

Tes yang menyentuh database mengembalikannya ke semula (`import-all-check.mjs` dan
`migrate-all-check.mjs` memakai database sementara yang dihapus di akhir; yang lain
memakai snapshot yang diambil sebelum mutasi). `production:preflight` dan
`content:check` sepenuhnya read-only.

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
- **Security header** global (`next.config.ts`): `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`,
  `Permissions-Policy: camera=(), microphone=(), geolocation=()`; plus
  `Strict-Transport-Security` di build produksi. `X-Powered-By` dimatikan.
- `/admin/*` dan `/api/*` juga mengirim `X-Robots-Tag: noindex, nofollow` — bukan
  hanya mengandalkan `robots.txt`.
- JSON-LD (`Organization`, `WebSite`) di-escape sehingga nilai yang dapat diedit
  admin tidak bisa keluar dari elemen `<script>`.
- **CSP belum ditambahkan** pada rilis ini (implementasi nonce perlu diuji
  menyeluruh); dicatat sebagai follow-up.

## SEO teknis

- `/robots.txt` dan `/sitemap.xml` dihasilkan dari `SITE_URL` (tanpa menebak host
  dari header request). `/admin` dan `/api` tidak diiklankan ke crawler.
- Canonical: prioritas `seo.canonical` valid → `SITE_URL` valid → tidak dirender.
  Nilai rusak di database diabaikan dengan aman, tidak pernah membuat homepage 500.
- `/api/health` — readiness read-only (`200` siap / `503` belum siap).

## Berkas konten

`data/site.json` = konten bawaan sekaligus fallback. `data/site.ts` hanya membungkusnya
dengan tipe. Untuk mengubah tampilan awal sebelum seed pertama, edit JSON itu lalu
jalankan `npm run db:seed:sql` dan impor ulang.

Gambar portfolio bawaan ada di `public/projects/` dan masih berupa visual konsep
sementara — ganti dengan dokumentasi project asli (lewat panel admin) sebelum
publikasi resmi.

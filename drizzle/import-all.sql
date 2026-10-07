-- CV Amana Perkasa — skema + konten, siap import ke phpMyAdmin.
-- Dihasilkan oleh `npm run db:seed:sql`. Jangan diedit manual; edit data/site.json lalu jalankan ulang.
-- Aman diimpor berulang, termasuk pada database yang baru separuh termigrasi: CREATE TABLE
-- memakai IF NOT EXISTS dan setiap ALTER dijaga lewat information_schema.
-- Impor ke database yang dituju (pilih database di phpMyAdmin) — penjagaan memakai
-- DATABASE(), jadi tanpa database terpilih penjagaannya tidak akan cocok.
-- File ini TIDAK memuat kredensial. Buat admin pertama dengan `npm run db:seed`
-- sambil menyetel ADMIN_USERNAME dan ADMIN_PASSWORD di environment.

SET NAMES utf8mb4;

-- 0000_init.sql
CREATE TABLE IF NOT EXISTS`admin_users` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`username` varchar(80) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `admin_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_users_username_uq` UNIQUE(`username`)
);
CREATE TABLE IF NOT EXISTS`media` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`filename` varchar(255) NOT NULL,
	`path` varchar(500) NOT NULL,
	`mime` varchar(80) NOT NULL,
	`size` int unsigned NOT NULL DEFAULT 0,
	`alt` varchar(255) NOT NULL DEFAULT '',
	`width` int unsigned,
	`height` int unsigned,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `media_id` PRIMARY KEY(`id`)
);
CREATE TABLE IF NOT EXISTS`projects` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`title` varchar(150) NOT NULL,
	`category` varchar(80) NOT NULL DEFAULT '',
	`image` varchar(500) NOT NULL,
	`description` text NOT NULL,
	`position` int unsigned NOT NULL DEFAULT 0,
	`published` boolean NOT NULL DEFAULT true,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
CREATE TABLE IF NOT EXISTS`services` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`no` varchar(4) NOT NULL DEFAULT '',
	`title` varchar(150) NOT NULL,
	`description` text NOT NULL,
	`position` int unsigned NOT NULL DEFAULT 0,
	`published` boolean NOT NULL DEFAULT true,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `services_id` PRIMARY KEY(`id`)
);
CREATE TABLE IF NOT EXISTS`settings` (
	`key` varchar(100) NOT NULL,
	`value` text NOT NULL,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `settings_key` PRIMARY KEY(`key`)
);
CREATE TABLE IF NOT EXISTS`team_members` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`role` varchar(100) NOT NULL,
	`name` varchar(150) NOT NULL,
	`description` text NOT NULL,
	`photo` varchar(500) NOT NULL DEFAULT '',
	`position` int unsigned NOT NULL DEFAULT 0,
	`published` boolean NOT NULL DEFAULT true,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `team_members_id` PRIMARY KEY(`id`)
);
CREATE TABLE IF NOT EXISTS`workflow_steps` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`no` varchar(4) NOT NULL DEFAULT '',
	`title` varchar(150) NOT NULL,
	`description` text NOT NULL,
	`position` int unsigned NOT NULL DEFAULT 0,
	`published` boolean NOT NULL DEFAULT true,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workflow_steps_id` PRIMARY KEY(`id`)
);

-- 0001_project_gallery_and_legalities.sql
CREATE TABLE IF NOT EXISTS`company_legalities` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`title` varchar(150) NOT NULL,
	`value` varchar(150) NOT NULL DEFAULT '',
	`description` text NOT NULL,
	`position` int unsigned NOT NULL DEFAULT 0,
	`published` boolean NOT NULL DEFAULT true,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `company_legalities_id` PRIMARY KEY(`id`)
);
CREATE TABLE IF NOT EXISTS`project_images` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`project_id` int unsigned NOT NULL,
	`image` varchar(500) NOT NULL,
	`caption` varchar(255) NOT NULL DEFAULT '',
	`position` int unsigned NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `project_images_id` PRIMARY KEY(`id`)
);
SET @ddl_3 := IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'projects' AND COLUMN_NAME = 'client') = 0, 'ALTER TABLE `projects` ADD `client` varchar(150) DEFAULT '''' NOT NULL', 'DO 0');
PREPARE ddl_3 FROM @ddl_3;
EXECUTE ddl_3;
DEALLOCATE PREPARE ddl_3;;
SET @ddl_4 := IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'projects' AND COLUMN_NAME = 'location') = 0, 'ALTER TABLE `projects` ADD `location` varchar(150) DEFAULT '''' NOT NULL', 'DO 0');
PREPARE ddl_4 FROM @ddl_4;
EXECUTE ddl_4;
DEALLOCATE PREPARE ddl_4;;
SET @ddl_5 := IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'projects' AND COLUMN_NAME = 'year') = 0, 'ALTER TABLE `projects` ADD `year` varchar(9) DEFAULT '''' NOT NULL', 'DO 0');
PREPARE ddl_5 FROM @ddl_5;
EXECUTE ddl_5;
DEALLOCATE PREPARE ddl_5;;
SET @ddl_6 := IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'projects' AND COLUMN_NAME = 'scope') = 0, 'ALTER TABLE `projects` ADD `scope` varchar(1000) DEFAULT '''' NOT NULL', 'DO 0');
PREPARE ddl_6 FROM @ddl_6;
EXECUTE ddl_6;
DEALLOCATE PREPARE ddl_6;;
SET @ddl_7 := IF((SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'project_images' AND CONSTRAINT_NAME = 'project_images_project_fk') = 0, 'ALTER TABLE `project_images` ADD CONSTRAINT `project_images_project_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action', 'DO 0');
PREPARE ddl_7 FROM @ddl_7;
EXECUTE ddl_7;
DEALLOCATE PREPARE ddl_7;;
SET @ddl_8 := IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'media' AND COLUMN_NAME = 'width') = 1, 'ALTER TABLE `media` DROP COLUMN `width`', 'DO 0');
PREPARE ddl_8 FROM @ddl_8;
EXECUTE ddl_8;
DEALLOCATE PREPARE ddl_8;;
SET @ddl_9 := IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'media' AND COLUMN_NAME = 'height') = 1, 'ALTER TABLE `media` DROP COLUMN `height`', 'DO 0');
PREPARE ddl_9 FROM @ddl_9;
EXECUTE ddl_9;
DEALLOCATE PREPARE ddl_9;;

-- 0002_why_choose_us_and_quotation_requests.sql
CREATE TABLE IF NOT EXISTS`quotation_requests` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`name` varchar(150) NOT NULL,
	`company` varchar(150) NOT NULL DEFAULT '',
	`phone` varchar(40) NOT NULL,
	`email` varchar(190) NOT NULL DEFAULT '',
	`event_type` varchar(120) NOT NULL,
	`event_date` varchar(10) NOT NULL DEFAULT '',
	`location` varchar(255) NOT NULL DEFAULT '',
	`guest_count` varchar(50) NOT NULL DEFAULT '',
	`budget_range` varchar(100) NOT NULL DEFAULT '',
	`message` text NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'new',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quotation_requests_id` PRIMARY KEY(`id`)
);
CREATE TABLE IF NOT EXISTS`why_choose_us` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`title` varchar(150) NOT NULL,
	`description` text NOT NULL,
	`position` int unsigned NOT NULL DEFAULT 0,
	`published` boolean NOT NULL DEFAULT true,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `why_choose_us_id` PRIMARY KEY(`id`)
);

-- Generated by `npm run db:seed:sql`. Safe to re-run: INSERT IGNORE only fills gaps.
-- Import the schema first — either drizzle/import-all.sql (schema + data in one
-- file) or each drizzle/000X_*.sql in order.

SET NAMES utf8mb4;

-- Settings: one JSON document per group, mirroring lib/types.ts SiteSettings.
INSERT IGNORE INTO `settings` (`key`, `value`) VALUES ('identity', '{\"company\":\"CV AMANA PERKASA\",\"shortName\":\"AMANA PERKASA\",\"initials\":\"AP\",\"logo\":\"\",\"tagline\":\"Event Service & Creative Production\",\"navCta\":\"Konsultasi Event\",\"copyright\":\"All rights reserved.\"}');
INSERT IGNORE INTO `settings` (`key`, `value`) VALUES ('hero', '{\"title\":\"Mewujudkan Event Berkelas, Terukur, dan Berkesan.\",\"description\":\"Kami membantu merancang dan mengeksekusi kebutuhan event secara profesional—mulai dari konsep, produksi, teknis, hingga pelaksanaan di lapangan.\",\"image\":\"/projects/corporate-conference.png\",\"ctaPrimary\":\"Lihat Project\",\"ctaSecondary\":\"Hubungi Kami\",\"scrollHint\":\"Scroll to explore\"}');
INSERT IGNORE INTO `settings` (`key`, `value`) VALUES ('about', '{\"kicker\":\"Tentang Perusahaan\",\"heading\":\"Partner eksekusi untuk event yang harus berjalan tepat.\",\"body\":\"CV AMANA PERKASA bergerak dalam pelayanan jasa event untuk kebutuhan korporasi, instansi, komunitas, pendidikan, hingga acara sosial. Kami mengutamakan koordinasi yang rapi, visual yang kuat, dan eksekusi yang terarah agar setiap acara berjalan sesuai tujuan.\",\"stats\":[{\"value\":\"360°\",\"label\":\"Event Support\"},{\"value\":\"10\",\"label\":\"Project Concepts\"},{\"value\":\"1\",\"label\":\"Integrated Team\"}]}');
INSERT IGNORE INTO `settings` (`key`, `value`) VALUES ('services', '{\"kicker\":\"Layanan Kami\",\"heading\":\"Dari ide hingga event selesai.\",\"description\":\"Layanan dapat dikombinasikan sesuai kebutuhan project, skala acara, lokasi, serta scope pekerjaan.\"}');
INSERT IGNORE INTO `settings` (`key`, `value`) VALUES ('projects', '{\"kicker\":\"Selected Projects\",\"heading\":\"Portfolio event.\",\"description\":\"Ganti judul, deskripsi, kategori, dan foto asli project melalui panel admin.\"}');
INSERT IGNORE INTO `settings` (`key`, `value`) VALUES ('whyUs', '{\"kicker\":\"Kenapa Memilih Kami\",\"heading\":\"Partner event yang bekerja terstruktur dari awal hingga selesai.\",\"description\":\"Kami menggabungkan perencanaan, koordinasi, kreativitas, dan kontrol lapangan agar setiap detail acara tetap berjalan sesuai tujuan.\"}');
INSERT IGNORE INTO `settings` (`key`, `value`) VALUES ('process', '{\"kicker\":\"Cara Kerja\",\"heading\":\"Workflow yang terstruktur.\"}');
INSERT IGNORE INTO `settings` (`key`, `value`) VALUES ('team', '{\"kicker\":\"Management & Team\",\"heading\":\"Satu tim, satu kendali project.\",\"description\":\"Struktur ini dibuat sebagai template. Ganti nama dan jabatan sesuai struktur aktual CV AMANA PERKASA.\"}');
INSERT IGNORE INTO `settings` (`key`, `value`) VALUES ('legalities', '{\"kicker\":\"Legalitas Perusahaan\",\"heading\":\"Perusahaan yang terdaftar dan siap mendukung kerja sama profesional.\",\"description\":\"\"}');
INSERT IGNORE INTO `settings` (`key`, `value`) VALUES ('contact', '{\"kicker\":\"Let\'s Collaborate\",\"heading\":\"Punya event yang ingin diwujudkan?\",\"description\":\"Diskusikan kebutuhan acara, scope pekerjaan, timeline, dan kebutuhan teknis bersama tim CV AMANA PERKASA.\",\"phone\":\"08xx-xxxx-xxxx\",\"email\":\"email@perusahaan.com\",\"address\":\"Alamat perusahaan dapat diganti melalui panel admin.\",\"instagram\":\"@amanaperkasa\",\"whatsapp\":\"\",\"formHeading\":\"Minta Penawaran Event\",\"formDescription\":\"Isi brief singkat kebutuhan acara Anda. Tim kami akan meninjau kebutuhan tersebut sebelum menghubungi Anda.\",\"submitLabel\":\"Kirim Permintaan Penawaran\",\"successHeading\":\"Permintaan berhasil dikirim.\",\"successDescription\":\"Terima kasih. Tim kami akan menghubungi Anda melalui kontak yang diberikan.\"}');
INSERT IGNORE INTO `settings` (`key`, `value`) VALUES ('seo', '{\"title\":\"CV AMANA PERKASA | Event Service & Creative Production\",\"description\":\"Company profile CV AMANA PERKASA — pelayanan jasa event, produksi kreatif, dan event management.\",\"keywords\":\"\",\"ogImage\":\"\",\"canonical\":\"\"}');

-- Services
INSERT IGNORE INTO `services` (`id`, `no`, `title`, `description`, `position`, `published`) VALUES (1, '01', 'Corporate Event', 'Seminar, conference, meeting, gathering, launching, dan kebutuhan event perusahaan.', 1, 1);
INSERT IGNORE INTO `services` (`id`, `no`, `title`, `description`, `position`, `published`) VALUES (2, '02', 'Wedding & Social Event', 'Perencanaan, dekorasi, teknis, serta koordinasi acara sosial dan pernikahan.', 2, 1);
INSERT IGNORE INTO `services` (`id`, `no`, `title`, `description`, `position`, `published`) VALUES (3, '03', 'Exhibition & Booth', 'Konsep booth, layout pameran, produksi area display, dan dukungan operasional.', 3, 1);
INSERT IGNORE INTO `services` (`id`, `no`, `title`, `description`, `position`, `published`) VALUES (4, '04', 'Concert & Entertainment', 'Panggung, lighting, audio, LED, talent handling, dan koordinasi produksi hiburan.', 4, 1);
INSERT IGNORE INTO `services` (`id`, `no`, `title`, `description`, `position`, `published`) VALUES (5, '05', 'Ceremony & Gathering', 'Acara seremonial, instansi, wisuda, gathering, serta kegiatan formal lainnya.', 5, 1);
INSERT IGNORE INTO `services` (`id`, `no`, `title`, `description`, `position`, `published`) VALUES (6, '06', 'Community & Religious Event', 'Dukungan pelaksanaan kegiatan komunitas dan keagamaan dengan kebutuhan yang fleksibel.', 6, 1);

-- Projects
INSERT IGNORE INTO `projects` (`id`, `title`, `category`, `image`, `description`, `client`, `location`, `year`, `scope`, `position`, `published`) VALUES (1, 'Corporate Conference', 'Corporate Event', '/projects/corporate-conference.png', 'Konsep ballroom modern dengan stage, LED screen, registration, dan area networking.', '', '', '', '', 1, 1);
INSERT IGNORE INTO `projects` (`id`, `title`, `category`, `image`, `description`, `client`, `location`, `year`, `scope`, `position`, `published`) VALUES (2, 'Wedding Reception', 'Social Event', '/projects/wedding-reception.png', 'Konsep resepsi elegan dengan dekorasi floral, stage, aisle, dan banquet setup.', '', '', '', '', 2, 1);
INSERT IGNORE INTO `projects` (`id`, `title`, `category`, `image`, `description`, `client`, `location`, `year`, `scope`, `position`, `published`) VALUES (3, 'Product Launch', 'Brand Activation', '/projects/product-launch.png', 'Panggung peluncuran produk dengan visual LED, reveal moment, dan area display.', '', '', '', '', 3, 1);
INSERT IGNORE INTO `projects` (`id`, `title`, `category`, `image`, `description`, `client`, `location`, `year`, `scope`, `position`, `published`) VALUES (4, 'Live Concert', 'Entertainment', '/projects/live-concert.png', 'Produksi panggung skala besar dengan lighting, audio, LED, dan crowd management.', '', '', '', '', 4, 1);
INSERT IGNORE INTO `projects` (`id`, `title`, `category`, `image`, `description`, `client`, `location`, `year`, `scope`, `position`, `published`) VALUES (5, 'Exhibition', 'Exhibition', '/projects/exhibition.png', 'Area pameran profesional dengan booth modern, circulation flow, dan display zone.', '', '', '', '', 5, 1);
INSERT IGNORE INTO `projects` (`id`, `title`, `category`, `image`, `description`, `client`, `location`, `year`, `scope`, `position`, `published`) VALUES (6, 'Formal Ceremony', 'Ceremony', '/projects/formal-ceremony.png', 'Acara formal dengan tata panggung, podium, seating, dan pengelolaan teknis.', '', '', '', '', 6, 1);
INSERT IGNORE INTO `projects` (`id`, `title`, `category`, `image`, `description`, `client`, `location`, `year`, `scope`, `position`, `published`) VALUES (7, 'Outdoor Festival', 'Public Event', '/projects/outdoor-festival.png', 'Festival terbuka dengan tenant area, stage, lighting, dan pengaturan alur pengunjung.', '', '', '', '', 7, 1);
INSERT IGNORE INTO `projects` (`id`, `title`, `category`, `image`, `description`, `client`, `location`, `year`, `scope`, `position`, `published`) VALUES (8, 'Gala Dinner', 'Corporate Gathering', '/projects/gala-dinner.png', 'Banquet dan gala dinner dengan atmosfer premium, stage, table setting, dan ambience lighting.', '', '', '', '', 8, 1);
INSERT IGNORE INTO `projects` (`id`, `title`, `category`, `image`, `description`, `client`, `location`, `year`, `scope`, `position`, `published`) VALUES (9, 'Graduation Event', 'Education Event', '/projects/graduation.png', 'Konsep acara kelulusan dengan stage formal, aisle, seating, dan dekorasi institusional.', '', '', '', '', 9, 1);
INSERT IGNORE INTO `projects` (`id`, `title`, `category`, `image`, `description`, `client`, `location`, `year`, `scope`, `position`, `published`) VALUES (10, 'Religious Gathering', 'Community Event', '/projects/religious-event.png', 'Acara keagamaan dengan setting panggung yang rapi, seating terorganisir, dan dukungan teknis.', '', '', '', '', 10, 1);

-- Why Choose Us
INSERT IGNORE INTO `why_choose_us` (`id`, `title`, `description`, `position`, `published`) VALUES (1, 'Satu Jalur Koordinasi', 'Konsep, produksi, vendor, kebutuhan teknis, dan operasional dikoordinasikan dalam alur kerja yang jelas.', 1, 1);
INSERT IGNORE INTO `why_choose_us` (`id`, `title`, `description`, `position`, `published`) VALUES (2, 'Perencanaan Terukur', 'Timeline, scope pekerjaan, kebutuhan produksi, dan checkpoint disusun sejak awal agar pelaksanaan lebih terkendali.', 2, 1);
INSERT IGNORE INTO `why_choose_us` (`id`, `title`, `description`, `position`, `published`) VALUES (3, 'Eksekusi Adaptif', 'Tim lapangan siap merespons perubahan kondisi acara tanpa kehilangan kontrol terhadap rundown dan kebutuhan utama.', 3, 1);
INSERT IGNORE INTO `why_choose_us` (`id`, `title`, `description`, `position`, `published`) VALUES (4, 'Detail yang Konsisten', 'Visual, teknis, flow tamu, serta kebutuhan operasional diperhatikan hingga acara selesai.', 4, 1);

-- Project gallery

-- Company legalities

-- Team
INSERT IGNORE INTO `team_members` (`id`, `role`, `name`, `description`, `photo`, `position`, `published`) VALUES (1, 'Director', 'Nama Direktur', 'Direction & Client Relations', '', 1, 1);
INSERT IGNORE INTO `team_members` (`id`, `role`, `name`, `description`, `photo`, `position`, `published`) VALUES (2, 'Project Manager', 'Nama Project Manager', 'Planning & Project Control', '', 2, 1);
INSERT IGNORE INTO `team_members` (`id`, `role`, `name`, `description`, `photo`, `position`, `published`) VALUES (3, 'Operations', 'Nama Operations', 'Vendor & Field Coordination', '', 3, 1);
INSERT IGNORE INTO `team_members` (`id`, `role`, `name`, `description`, `photo`, `position`, `published`) VALUES (4, 'Creative & Production', 'Nama Creative Lead', 'Concept, Visual & Production', '', 4, 1);

-- Workflow
INSERT IGNORE INTO `workflow_steps` (`id`, `no`, `title`, `description`, `position`, `published`) VALUES (1, '01', 'Brief & Consultation', 'Memahami tujuan, audiens, skala, kebutuhan teknis, dan batasan event.', 1, 1);
INSERT IGNORE INTO `workflow_steps` (`id`, `no`, `title`, `description`, `position`, `published`) VALUES (2, '02', 'Concept & Planning', 'Menyusun konsep, timeline, kebutuhan produksi, vendor, dan rencana pelaksanaan.', 2, 1);
INSERT IGNORE INTO `workflow_steps` (`id`, `no`, `title`, `description`, `position`, `published`) VALUES (3, '03', 'Production', 'Menyiapkan seluruh kebutuhan visual, teknis, venue, talent, dan operasional.', 3, 1);
INSERT IGNORE INTO `workflow_steps` (`id`, `no`, `title`, `description`, `position`, `published`) VALUES (4, '04', 'Execution', 'Koordinasi onsite, rundown control, technical control, dan problem solving.', 4, 1);
INSERT IGNORE INTO `workflow_steps` (`id`, `no`, `title`, `description`, `position`, `published`) VALUES (5, '05', 'Evaluation', 'Serah terima dokumentasi, evaluasi pelaksanaan, serta kebutuhan tindak lanjut.', 5, 1);

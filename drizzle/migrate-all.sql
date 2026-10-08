-- CV Amana Perkasa — seluruh migrasi skema, TANPA konten awal.
-- Dihasilkan oleh `npm run db:seed:sql`. Jangan diedit manual.
-- Gunakan file ini untuk MEMPERBARUI database produksi yang sudah berjalan:
-- hanya struktur yang diperbarui, konten produksi tidak tersentuh.
-- Aman diimpor berulang: CREATE TABLE IF NOT EXISTS dan setiap ALTER dijaga
-- lewat information_schema. Untuk instalasi BARU gunakan import-all.sql.
-- File ini TIDAK memuat kredensial admin.

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

-- 0003_credibility_clients_testimonials_case_studies.sql
CREATE TABLE IF NOT EXISTS`clients_partners` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`name` varchar(150) NOT NULL,
	`logo` varchar(500) NOT NULL DEFAULT '',
	`position` int unsigned NOT NULL DEFAULT 0,
	`published` boolean NOT NULL DEFAULT true,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clients_partners_id` PRIMARY KEY(`id`)
);
CREATE TABLE IF NOT EXISTS`testimonials` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`quote` text NOT NULL,
	`name` varchar(150) NOT NULL,
	`role` varchar(150) NOT NULL DEFAULT '',
	`company` varchar(150) NOT NULL DEFAULT '',
	`project` varchar(150) NOT NULL DEFAULT '',
	`photo` varchar(500) NOT NULL DEFAULT '',
	`position` int unsigned NOT NULL DEFAULT 0,
	`published` boolean NOT NULL DEFAULT true,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `testimonials_id` PRIMARY KEY(`id`)
);
SET @ddl_3 := IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'projects' AND COLUMN_NAME = 'objective') = 0, 'ALTER TABLE `projects` ADD `objective` varchar(2000) DEFAULT '''' NOT NULL', 'DO 0');
PREPARE ddl_3 FROM @ddl_3;
EXECUTE ddl_3;
DEALLOCATE PREPARE ddl_3;;
SET @ddl_4 := IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'projects' AND COLUMN_NAME = 'approach') = 0, 'ALTER TABLE `projects` ADD `approach` varchar(2000) DEFAULT '''' NOT NULL', 'DO 0');
PREPARE ddl_4 FROM @ddl_4;
EXECUTE ddl_4;
DEALLOCATE PREPARE ddl_4;;
SET @ddl_5 := IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'projects' AND COLUMN_NAME = 'outcome') = 0, 'ALTER TABLE `projects` ADD `outcome` varchar(2000) DEFAULT '''' NOT NULL', 'DO 0');
PREPARE ddl_5 FROM @ddl_5;
EXECUTE ddl_5;
DEALLOCATE PREPARE ddl_5;;

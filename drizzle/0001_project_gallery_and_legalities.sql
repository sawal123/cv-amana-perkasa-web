CREATE TABLE `company_legalities` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`title` varchar(150) NOT NULL,
	`value` varchar(150) NOT NULL DEFAULT '',
	`description` text NOT NULL,
	`position` int unsigned NOT NULL DEFAULT 0,
	`published` boolean NOT NULL DEFAULT true,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `company_legalities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_images` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`project_id` int unsigned NOT NULL,
	`image` varchar(500) NOT NULL,
	`caption` varchar(255) NOT NULL DEFAULT '',
	`position` int unsigned NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `project_images_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `projects` ADD `client` varchar(150) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `location` varchar(150) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `year` varchar(9) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `scope` varchar(1000) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `project_images` ADD CONSTRAINT `project_images_project_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `media` DROP COLUMN `width`;--> statement-breakpoint
ALTER TABLE `media` DROP COLUMN `height`;
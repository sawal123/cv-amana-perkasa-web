CREATE TABLE `clients_partners` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`name` varchar(150) NOT NULL,
	`logo` varchar(500) NOT NULL DEFAULT '',
	`position` int unsigned NOT NULL DEFAULT 0,
	`published` boolean NOT NULL DEFAULT true,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clients_partners_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `testimonials` (
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
--> statement-breakpoint
ALTER TABLE `projects` ADD `objective` varchar(2000) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `approach` varchar(2000) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `outcome` varchar(2000) DEFAULT '' NOT NULL;
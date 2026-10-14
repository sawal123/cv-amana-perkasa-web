CREATE TABLE `brochures` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`title` varchar(150) NOT NULL,
	`description` varchar(500) NOT NULL DEFAULT '',
	`filename` varchar(255) NOT NULL,
	`stored_name` varchar(100) NOT NULL,
	`mime` varchar(80) NOT NULL DEFAULT 'application/pdf',
	`size` int unsigned NOT NULL DEFAULT 0,
	`position` int unsigned NOT NULL DEFAULT 0,
	`published` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `brochures_id` PRIMARY KEY(`id`)
);

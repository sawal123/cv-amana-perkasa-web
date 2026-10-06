CREATE TABLE `admin_users` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`username` varchar(80) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `admin_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_users_username_uq` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE TABLE `media` (
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
--> statement-breakpoint
CREATE TABLE `projects` (
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
--> statement-breakpoint
CREATE TABLE `services` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`no` varchar(4) NOT NULL DEFAULT '',
	`title` varchar(150) NOT NULL,
	`description` text NOT NULL,
	`position` int unsigned NOT NULL DEFAULT 0,
	`published` boolean NOT NULL DEFAULT true,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `services_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` varchar(100) NOT NULL,
	`value` text NOT NULL,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `settings_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE TABLE `team_members` (
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
--> statement-breakpoint
CREATE TABLE `workflow_steps` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`no` varchar(4) NOT NULL DEFAULT '',
	`title` varchar(150) NOT NULL,
	`description` text NOT NULL,
	`position` int unsigned NOT NULL DEFAULT 0,
	`published` boolean NOT NULL DEFAULT true,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workflow_steps_id` PRIMARY KEY(`id`)
);

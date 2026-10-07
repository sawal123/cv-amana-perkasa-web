CREATE TABLE `quotation_requests` (
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
--> statement-breakpoint
CREATE TABLE `why_choose_us` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`title` varchar(150) NOT NULL,
	`description` text NOT NULL,
	`position` int unsigned NOT NULL DEFAULT 0,
	`published` boolean NOT NULL DEFAULT true,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `why_choose_us_id` PRIMARY KEY(`id`)
);

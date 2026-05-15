CREATE TABLE `inventory_schedules` (
	`id` text PRIMARY KEY NOT NULL,
	`scheduled_at` text NOT NULL,
	`title` text NOT NULL,
	`note` text,
	`status` text DEFAULT 'planned' NOT NULL,
	`created_at` text NOT NULL
);

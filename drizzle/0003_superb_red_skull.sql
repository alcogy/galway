CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`tel` text,
	`zipcode` text,
	`address` text,
	`email` text,
	`note` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `shipping_slips` ADD `customer_id` text REFERENCES customers(id);
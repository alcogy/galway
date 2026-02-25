CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`name` text NOT NULL,
	`role` text DEFAULT 'general' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_email_unique` ON `accounts` (`email`);--> statement-breakpoint
CREATE TABLE `inventory` (
	`product_id` text PRIMARY KEY NOT NULL,
	`quantity` real DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`unit` text NOT NULL,
	`description` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_code_unique` ON `products` (`code`);--> statement-breakpoint
CREATE TABLE `receiving_slip_details` (
	`id` text PRIMARY KEY NOT NULL,
	`slip_id` text NOT NULL,
	`product_id` text NOT NULL,
	`line_no` integer NOT NULL,
	`quantity` real NOT NULL,
	FOREIGN KEY (`slip_id`) REFERENCES `receiving_slips`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `receiving_slips` (
	`id` text PRIMARY KEY NOT NULL,
	`slip_number` text NOT NULL,
	`received_at` text NOT NULL,
	`supplier_id` text NOT NULL,
	`account_id` text NOT NULL,
	`note` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `receiving_slips_slip_number_unique` ON `receiving_slips` (`slip_number`);--> statement-breakpoint
CREATE TABLE `shipping_slip_details` (
	`id` text PRIMARY KEY NOT NULL,
	`slip_id` text NOT NULL,
	`product_id` text NOT NULL,
	`line_no` integer NOT NULL,
	`quantity` real NOT NULL,
	FOREIGN KEY (`slip_id`) REFERENCES `shipping_slips`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `shipping_slips` (
	`id` text PRIMARY KEY NOT NULL,
	`slip_number` text NOT NULL,
	`shipped_at` text NOT NULL,
	`account_id` text NOT NULL,
	`note` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `shipping_slips_slip_number_unique` ON `shipping_slips` (`slip_number`);--> statement-breakpoint
CREATE TABLE `supplier_products` (
	`id` text PRIMARY KEY NOT NULL,
	`supplier_id` text NOT NULL,
	`product_id` text NOT NULL,
	FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_supplier_product` ON `supplier_products` (`supplier_id`,`product_id`);--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`tel` text,
	`fax` text,
	`zipcode` text,
	`address` text,
	`email` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);

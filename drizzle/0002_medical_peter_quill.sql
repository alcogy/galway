CREATE TABLE `product_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_categories_name_unique` ON `product_categories` (`name`);--> statement-breakpoint
ALTER TABLE `products` ADD `category_id` text REFERENCES product_categories(id);
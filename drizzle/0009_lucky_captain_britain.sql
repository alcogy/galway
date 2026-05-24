ALTER TABLE `receiving_slips` ADD `purchase_order_number` text;
--> statement-breakpoint
UPDATE `receiving_slips`
SET `purchase_order_number` = SUBSTR(`note`, INSTR(`note`, ': ') + 2),
    `note` = ''
WHERE `note` LIKE '発注番号: PO-%';
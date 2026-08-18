ALTER TABLE `orders` ADD `customerPhoneLookup` varchar(32) NULL;--> statement-breakpoint
UPDATE `orders` SET `customerPhoneLookup` = REGEXP_REPLACE(`customerPhone`, '[^0-9]', '');--> statement-breakpoint
ALTER TABLE `orders` MODIFY `customerPhoneLookup` varchar(32) NOT NULL;--> statement-breakpoint
CREATE INDEX `orders_phone_lookup_created_idx` ON `orders` (`customerPhoneLookup`,`createdAt`);

CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`slug` varchar(140) NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `categories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `orderEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`actorUserId` int,
	`eventType` varchar(80) NOT NULL,
	`fromStatus` varchar(40),
	`toStatus` varchar(40),
	`message` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `orderEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orderItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`productId` int,
	`productName` varchar(180) NOT NULL,
	`unitPriceInCents` int NOT NULL,
	`quantity` int NOT NULL,
	`configurationJson` text,
	`notes` text,
	CONSTRAINT `orderItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(32) NOT NULL,
	`customerName` varchar(160) NOT NULL,
	`customerPhone` varchar(32) NOT NULL,
	`fulfillmentMethod` enum('delivery','pickup') NOT NULL,
	`deliveryAddress` text,
	`customerNotes` text,
	`subtotalInCents` int NOT NULL,
	`deliveryFeeInCents` int NOT NULL DEFAULT 0,
	`totalInCents` int NOT NULL,
	`status` enum('aguardando_pagamento','confirmado','em_preparo','saiu_para_entrega','pronto_para_retirada','concluido','cancelado') NOT NULL DEFAULT 'aguardando_pagamento',
	`paymentMethod` enum('pix','credit_card','voucher','cash') NOT NULL,
	`paymentProvider` enum('asaas_test','asaas') NOT NULL DEFAULT 'asaas_test',
	`paymentStatus` enum('pending','confirmed','failed','cancelled','refunded') NOT NULL DEFAULT 'pending',
	`paymentReference` varchar(160),
	`paymentConfirmedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `printJobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`status` enum('queued','printed','failed') NOT NULL DEFAULT 'queued',
	`attempts` int NOT NULL DEFAULT 0,
	`printerName` varchar(160),
	`printedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `printJobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `productOptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`groupName` varchar(100) NOT NULL,
	`label` varchar(160) NOT NULL,
	`priceDeltaInCents` int NOT NULL DEFAULT 0,
	`isRequired` boolean NOT NULL DEFAULT false,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	CONSTRAINT `productOptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`categoryId` int NOT NULL,
	`name` varchar(180) NOT NULL,
	`description` text,
	`imageUrl` text,
	`priceInCents` int NOT NULL,
	`originalPriceInCents` int,
	`isActive` boolean NOT NULL DEFAULT true,
	`requiresConfiguration` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `storeSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`settingKey` varchar(120) NOT NULL,
	`settingValue` text NOT NULL,
	`updatedByUserId` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `storeSettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `store_settings_key_unique` UNIQUE(`settingKey`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','staff') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `orderEvents` ADD CONSTRAINT `orderEvents_orderId_orders_id_fk` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orderEvents` ADD CONSTRAINT `orderEvents_actorUserId_users_id_fk` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orderItems` ADD CONSTRAINT `orderItems_orderId_orders_id_fk` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `printJobs` ADD CONSTRAINT `printJobs_orderId_orders_id_fk` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `productOptions` ADD CONSTRAINT `productOptions_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_categoryId_categories_id_fk` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `storeSettings` ADD CONSTRAINT `storeSettings_updatedByUserId_users_id_fk` FOREIGN KEY (`updatedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `order_events_order_created_idx` ON `orderEvents` (`orderId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `orders_status_created_idx` ON `orders` (`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `orders_phone_idx` ON `orders` (`customerPhone`);--> statement-breakpoint
CREATE INDEX `print_jobs_status_created_idx` ON `printJobs` (`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `products_category_idx` ON `products` (`categoryId`);
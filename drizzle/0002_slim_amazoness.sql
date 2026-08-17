CREATE TABLE `paymentEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`provider` varchar(40) NOT NULL,
	`externalEventId` varchar(160) NOT NULL,
	`orderId` int,
	`eventType` varchar(120) NOT NULL,
	`payloadJson` text NOT NULL,
	`processedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `paymentEvents_id` PRIMARY KEY(`id`),
	CONSTRAINT `payment_events_provider_event_unique` UNIQUE(`provider`,`externalEventId`)
);
--> statement-breakpoint
ALTER TABLE `paymentEvents` ADD CONSTRAINT `paymentEvents_orderId_orders_id_fk` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `payment_events_order_processed_idx` ON `paymentEvents` (`orderId`,`processedAt`);
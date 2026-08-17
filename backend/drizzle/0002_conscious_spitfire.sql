ALTER TABLE `channel` RENAME TO `channel_metadata`;--> statement-breakpoint
ALTER TABLE `direct_message` RENAME TO `dm_metadata`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_channel_metadata` (
	`room_id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`acl_group_id` text,
	FOREIGN KEY (`room_id`) REFERENCES `room`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_channel_metadata`("room_id", "name", "acl_group_id") SELECT "room_id", "name", "acl_group_id" FROM `channel_metadata`;--> statement-breakpoint
DROP TABLE `channel_metadata`;--> statement-breakpoint
ALTER TABLE `__new_channel_metadata` RENAME TO `channel_metadata`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_dm_metadata` (
	`room_id` text PRIMARY KEY NOT NULL,
	`user_a_id` text NOT NULL,
	`user_b_id` text NOT NULL,
	FOREIGN KEY (`room_id`) REFERENCES `room`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_a_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_b_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "dm_metadata_participants_order_check" CHECK(("__new_dm_metadata"."user_a_id" < "__new_dm_metadata"."user_b_id"))
);
--> statement-breakpoint
INSERT INTO `__new_dm_metadata`("room_id", "user_a_id", "user_b_id") SELECT "room_id", "user_a_id", "user_b_id" FROM `dm_metadata`;--> statement-breakpoint
DROP TABLE `dm_metadata`;--> statement-breakpoint
ALTER TABLE `__new_dm_metadata` RENAME TO `dm_metadata`;--> statement-breakpoint
CREATE UNIQUE INDEX `dm_metadata_participants_idx` ON `dm_metadata` (`user_a_id`,`user_b_id`);--> statement-breakpoint
CREATE TABLE `__new_channel_role_override` (
	`channel_id` text NOT NULL,
	`role_id` text NOT NULL,
	`allowed` text DEFAULT '[]' NOT NULL,
	`denied` text DEFAULT '[]' NOT NULL,
	PRIMARY KEY(`channel_id`, `role_id`),
	FOREIGN KEY (`channel_id`) REFERENCES `channel_metadata`(`room_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`role_id`) REFERENCES `role`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_channel_role_override`("channel_id", "role_id", "allowed", "denied") SELECT "channel_id", "role_id", "allowed", "denied" FROM `channel_role_override`;--> statement-breakpoint
DROP TABLE `channel_role_override`;--> statement-breakpoint
ALTER TABLE `__new_channel_role_override` RENAME TO `channel_role_override`;
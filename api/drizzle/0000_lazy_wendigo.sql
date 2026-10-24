CREATE TABLE `bikes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`name` varchar(40) NOT NULL,
	`fit` enum('city','endurance','race','mtb') NOT NULL,
	`crank_mm` int,
	`saddle_mm` int,
	`stem_mm` int,
	`drop_mm` int,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `bikes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `identities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`provider` enum('google','yandex','telegram') NOT NULL,
	`provider_user_id` varchar(64) NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `identities_id` PRIMARY KEY(`id`),
	CONSTRAINT `identities_provider` UNIQUE(`provider`,`provider_user_id`)
);
--> statement-breakpoint
CREATE TABLE `oauth_states` (
	`state` varchar(64) NOT NULL,
	`provider` enum('google','yandex') NOT NULL,
	`user_id` int,
	`next` varchar(200) NOT NULL,
	`expires_at` datetime NOT NULL,
	CONSTRAINT `oauth_states_state` PRIMARY KEY(`state`)
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`user_id` int NOT NULL,
	`rider` enum('child','teen','adult'),
	`height_cm` int,
	`inseam_cm` int,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `profiles_user_id` PRIMARY KEY(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `readings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`bike_id` int,
	`fit` enum('city','endurance','race','mtb') NOT NULL,
	`knee` int,
	`back` int,
	`arm` int,
	`hip` int,
	`had_top` int NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `readings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`token_hash` varchar(64) NOT NULL,
	`expires_at` datetime NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `sessions_token_hash_unique` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(80) NOT NULL,
	`email` varchar(255),
	`role` enum('rider','fitter') NOT NULL DEFAULT 'rider',
	`created_at` datetime NOT NULL,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `bikes` ADD CONSTRAINT `bikes_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `identities` ADD CONSTRAINT `identities_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `oauth_states` ADD CONSTRAINT `oauth_states_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `profiles` ADD CONSTRAINT `profiles_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `readings` ADD CONSTRAINT `readings_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `readings` ADD CONSTRAINT `readings_bike_id_bikes_id_fk` FOREIGN KEY (`bike_id`) REFERENCES `bikes`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
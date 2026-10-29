ALTER TABLE `bikes` MODIFY `fit` enum('city','endurance','race','mtb','gravel') NOT NULL;
--> statement-breakpoint
ALTER TABLE `readings` MODIFY `fit` enum('city','endurance','race','mtb','gravel') NOT NULL;

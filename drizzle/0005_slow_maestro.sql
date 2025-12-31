ALTER TABLE "campers" RENAME COLUMN "name" TO "first_name";--> statement-breakpoint
ALTER TABLE "campers" ADD COLUMN "last_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "campers" ADD COLUMN "date_of_birth" date DEFAULT '2000-01-01' NOT NULL;
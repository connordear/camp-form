ALTER TABLE "users" DROP CONSTRAINT "users_clerk_id_unique";--> statement-breakpoint
ALTER TABLE "registrations" ALTER COLUMN "camper_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "clerk_id";
ALTER TABLE "registrations" ADD COLUMN "price_paid" integer;--> statement-breakpoint
ALTER TABLE "registrations" ADD COLUMN "status" text DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "registrations" DROP COLUMN "is_paid";
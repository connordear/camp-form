ALTER TABLE "registrations" ADD COLUMN "refunded_at" timestamp;--> statement-breakpoint
ALTER TABLE "registrations" ADD COLUMN "refund_amount" integer;--> statement-breakpoint
ALTER TABLE "registrations" ADD COLUMN "refund_reason" text;--> statement-breakpoint
ALTER TABLE "registrations" ADD COLUMN "stripe_refund_id" text;
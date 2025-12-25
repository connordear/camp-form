ALTER TABLE "registrations" ADD COLUMN "stripe_payment_intent_id" text;--> statement-breakpoint
ALTER TABLE "registrations" ADD COLUMN "stripe_session_id" text;
CREATE TABLE "refunds" (
	"id" text PRIMARY KEY NOT NULL,
	"registration_id" text NOT NULL,
	"amount" integer NOT NULL,
	"reason" text,
	"stripe_refund_id" text,
	"stripe_payment_intent_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_registration_id_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."registrations"("id") ON DELETE cascade ON UPDATE no action;
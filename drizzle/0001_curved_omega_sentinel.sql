CREATE TABLE "discounts" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"type" text NOT NULL,
	"amount" integer NOT NULL,
	"stripe_coupon_id" text,
	"condition_type" text NOT NULL,
	"deadline_date" date,
	"min_campers" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

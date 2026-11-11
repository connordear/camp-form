CREATE TABLE "booking_nights" (
	"site_id" text NOT NULL,
	"night" date NOT NULL,
	"booking_id" text,
	"price" integer DEFAULT 0 NOT NULL,
	"block_reason" text,
	CONSTRAINT "booking_nights_site_id_night_pk" PRIMARY KEY("site_id","night")
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"user_id" text,
	"guest_name" text NOT NULL,
	"guest_email" text,
	"guest_phone" text NOT NULL,
	"party_size" integer NOT NULL,
	"notes" text,
	"admin_notes" text,
	"check_in" date NOT NULL,
	"check_out" date NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"source" text DEFAULT 'online' NOT NULL,
	"hold_expires_at" timestamp,
	"subtotal" integer NOT NULL,
	"price_paid" integer,
	"paid_offline" boolean DEFAULT false NOT NULL,
	"cancellation_tiers" jsonb NOT NULL,
	"stripe_session_id" text,
	"stripe_payment_intent_id" text,
	"cancelled_at" timestamp,
	"cancelled_by" text,
	"refund_amount" integer,
	"stripe_refund_id" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campground_settings" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"is_booking_open" boolean DEFAULT false NOT NULL,
	"season_start" date,
	"season_end" date,
	"min_nights" integer DEFAULT 1 NOT NULL,
	"max_nights" integer DEFAULT 14 NOT NULL,
	"max_advance_days" integer DEFAULT 365 NOT NULL,
	"check_in_time" text DEFAULT '14:00' NOT NULL,
	"check_out_time" text DEFAULT '11:00' NOT NULL,
	"cancellation_tiers" jsonb DEFAULT '[{"minDaysBefore":7,"refundPercent":100},{"minDaysBefore":1,"refundPercent":50}]'::jsonb NOT NULL,
	"policy_text" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campsites" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"features" text[] DEFAULT '{}'::text[] NOT NULL,
	"nightly_rate" integer NOT NULL,
	"max_occupancy" integer DEFAULT 6 NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "booking_nights" ADD CONSTRAINT "booking_nights_site_id_campsites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."campsites"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_nights" ADD CONSTRAINT "booking_nights_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_site_id_campsites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."campsites"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "booking_nights_booking_id_index" ON "booking_nights" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "bookings_user_id_index" ON "bookings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "bookings_site_id_check_in_index" ON "bookings" USING btree ("site_id","check_in");--> statement-breakpoint
CREATE INDEX "bookings_status_index" ON "bookings" USING btree ("status");
CREATE TABLE "registration_details" (
	"registration_id" text PRIMARY KEY NOT NULL,
	"cabin_request" text,
	"parent_signature" text,
	"additional_info" text
);
--> statement-breakpoint
ALTER TABLE "camp_years" ADD COLUMN "day_price" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "campers" ADD COLUMN "are_photos_allowed" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "registrations" ADD COLUMN "num_days" integer;--> statement-breakpoint
ALTER TABLE "registration_details" ADD CONSTRAINT "registration_details_registration_id_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."registrations"("id") ON DELETE cascade ON UPDATE no action;
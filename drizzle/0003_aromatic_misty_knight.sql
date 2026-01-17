CREATE TABLE "medical_info" (
	"camper_id" text PRIMARY KEY NOT NULL,
	"health_care_number" text NOT NULL,
	"family_doctor" text NOT NULL,
	"doctor_phone" text NOT NULL,
	"height" text,
	"weight" text,
	"has_allergies" boolean DEFAULT false NOT NULL,
	"allergies_details" text,
	"uses_epi_pen" boolean DEFAULT false NOT NULL,
	"has_medications_at_camp" boolean DEFAULT false NOT NULL,
	"medications_at_camp_details" text,
	"has_medications_not_at_camp" boolean DEFAULT false NOT NULL,
	"medications_not_at_camp_details" text,
	"otc_permissions" jsonb DEFAULT '[]'::jsonb,
	"has_medical_conditions" boolean DEFAULT false NOT NULL,
	"medical_conditions_details" text,
	"additional_info" text
);
--> statement-breakpoint
ALTER TABLE "camp_years" ALTER COLUMN "start_date" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "camp_years" ALTER COLUMN "end_date" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "campers" ADD COLUMN "dietary_restrictions" text;--> statement-breakpoint
ALTER TABLE "medical_info" ADD CONSTRAINT "medical_info_camper_id_campers_id_fk" FOREIGN KEY ("camper_id") REFERENCES "public"."campers"("id") ON DELETE cascade ON UPDATE no action;
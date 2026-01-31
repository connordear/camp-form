CREATE TABLE "addresses" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"address_line_1" text NOT NULL,
	"address_line_2" text,
	"city" text NOT NULL,
	"stateProv" text NOT NULL,
	"country" text NOT NULL,
	"postalZip" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "camp_year_prices" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"camp_id" text NOT NULL,
	"year" integer NOT NULL,
	"base_price" integer DEFAULT 0 NOT NULL,
	"is_day_price" boolean DEFAULT false NOT NULL,
	CONSTRAINT "camp_year_prices_id_camp_id_year_unique" UNIQUE("id","camp_id","year")
);
--> statement-breakpoint
CREATE TABLE "camp_years" (
	"year" integer NOT NULL,
	"camp_id" text NOT NULL,
	"capacity" integer,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "camp_years_camp_id_year_pk" PRIMARY KEY("camp_id","year")
);
--> statement-breakpoint
CREATE TABLE "camper_emergency_contacts" (
	"camper_id" text NOT NULL,
	"emergency_contact_id" text NOT NULL,
	"priority" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "camper_emergency_contacts_camper_id_emergency_contact_id_pk" PRIMARY KEY("camper_id","emergency_contact_id")
);
--> statement-breakpoint
CREATE TABLE "campers" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"address_id" text,
	"first_name" text DEFAULT '' NOT NULL,
	"last_name" text DEFAULT '' NOT NULL,
	"date_of_birth" date DEFAULT '2000-01-01' NOT NULL,
	"swimming_level" text DEFAULT '',
	"gender" text DEFAULT '',
	"has_been_to_camp" boolean DEFAULT false,
	"shirt_size" text DEFAULT '',
	"are_photos_allowed" boolean DEFAULT false NOT NULL,
	"dietary_restrictions" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "camps" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emergency_contacts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"relationship" text NOT NULL,
	"relationship_other" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE "registration_details" (
	"registration_id" text PRIMARY KEY NOT NULL,
	"cabin_request" text,
	"parent_signature" text,
	"additional_info" text
);
--> statement-breakpoint
CREATE TABLE "registrations" (
	"id" text PRIMARY KEY NOT NULL,
	"camp_id" text NOT NULL,
	"camp_year" integer NOT NULL,
	"price_id" text NOT NULL,
	"camper_id" text NOT NULL,
	"num_days" integer,
	"price_paid" integer,
	"status" text DEFAULT 'draft' NOT NULL,
	"stripe_payment_intent_id" text,
	"stripe_session_id" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "registrations_camper_id_camp_id_camp_year_unique" UNIQUE("camper_id","camp_id","camp_year")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"stripe_customer_id" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "camp_year_prices" ADD CONSTRAINT "camp_year_prices_camp_id_year_camp_years_camp_id_year_fk" FOREIGN KEY ("camp_id","year") REFERENCES "public"."camp_years"("camp_id","year") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "camp_years" ADD CONSTRAINT "camp_years_camp_id_camps_id_fk" FOREIGN KEY ("camp_id") REFERENCES "public"."camps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "camper_emergency_contacts" ADD CONSTRAINT "fk_cec_camper" FOREIGN KEY ("camper_id") REFERENCES "public"."campers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "camper_emergency_contacts" ADD CONSTRAINT "fk_cec_contact" FOREIGN KEY ("emergency_contact_id") REFERENCES "public"."emergency_contacts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campers" ADD CONSTRAINT "campers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campers" ADD CONSTRAINT "campers_address_id_addresses_id_fk" FOREIGN KEY ("address_id") REFERENCES "public"."addresses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_contacts" ADD CONSTRAINT "emergency_contacts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_info" ADD CONSTRAINT "medical_info_camper_id_campers_id_fk" FOREIGN KEY ("camper_id") REFERENCES "public"."campers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registration_details" ADD CONSTRAINT "registration_details_registration_id_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."registrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_camper_id_campers_id_fk" FOREIGN KEY ("camper_id") REFERENCES "public"."campers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "fk_reg_camp_year" FOREIGN KEY ("camp_id","camp_year") REFERENCES "public"."camp_years"("camp_id","year") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "fk_reg_price" FOREIGN KEY ("price_id","camp_id","camp_year") REFERENCES "public"."camp_year_prices"("id","camp_id","year") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "one_default_per_user_index" ON "addresses" USING btree ("user_id") WHERE "addresses"."is_default" = true;
CREATE TABLE "camper_emergency_contacts" (
	"camper_id" text NOT NULL,
	"emergency_contact_id" text NOT NULL,
	"priority" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "camper_emergency_contacts_camper_id_emergency_contact_id_pk" PRIMARY KEY("camper_id","emergency_contact_id")
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
ALTER TABLE "camper_emergency_contacts" ADD CONSTRAINT "camper_emergency_contacts_camper_id_campers_id_fk" FOREIGN KEY ("camper_id") REFERENCES "public"."campers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "camper_emergency_contacts" ADD CONSTRAINT "camper_emergency_contacts_emergency_contact_id_emergency_contacts_id_fk" FOREIGN KEY ("emergency_contact_id") REFERENCES "public"."emergency_contacts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_contacts" ADD CONSTRAINT "emergency_contacts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
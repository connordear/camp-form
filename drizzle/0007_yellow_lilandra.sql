CREATE TABLE "camp_years" (
	"year" integer NOT NULL,
	"camp_id" integer NOT NULL,
	"base_price" integer DEFAULT 0,
	"capacity" integer,
	"start_date" date,
	"end_date" date,
	CONSTRAINT "camp_years_camp_id_year_pk" PRIMARY KEY("camp_id","year")
);
--> statement-breakpoint
ALTER TABLE "campers" RENAME COLUMN "clientId" TO "client_id";--> statement-breakpoint
ALTER TABLE "registrations" RENAME COLUMN "clientId" TO "client_id";--> statement-breakpoint
ALTER TABLE "camp_years" ADD CONSTRAINT "camp_years_camp_id_camps_id_fk" FOREIGN KEY ("camp_id") REFERENCES "public"."camps"("id") ON DELETE no action ON UPDATE no action;
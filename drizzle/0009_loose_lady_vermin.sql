ALTER TABLE "camper_addresses" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "camper_addresses" CASCADE;--> statement-breakpoint
ALTER TABLE "campers" ADD COLUMN "address_id" integer;--> statement-breakpoint
ALTER TABLE "campers" ADD CONSTRAINT "campers_address_id_addresses_id_fk" FOREIGN KEY ("address_id") REFERENCES "public"."addresses"("id") ON DELETE no action ON UPDATE no action;
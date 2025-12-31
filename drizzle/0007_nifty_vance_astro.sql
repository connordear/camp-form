ALTER TABLE "addresses" ALTER COLUMN "address_line_1" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "addresses" ALTER COLUMN "city" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "addresses" ALTER COLUMN "stateProv" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "addresses" ALTER COLUMN "country" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "addresses" ALTER COLUMN "postalZip" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "camper_addresses" ALTER COLUMN "camper_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "camper_addresses" ALTER COLUMN "address_id" SET NOT NULL;
ALTER TABLE "camp_years" ALTER COLUMN "day_price" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "camp_years" ALTER COLUMN "day_price" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "campers" ALTER COLUMN "are_photos_allowed" SET NOT NULL;
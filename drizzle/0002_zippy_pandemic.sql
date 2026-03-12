ALTER TABLE "discounts" ADD COLUMN "code" text;--> statement-breakpoint
ALTER TABLE "discounts" ADD CONSTRAINT "discounts_code_unique" UNIQUE("code");
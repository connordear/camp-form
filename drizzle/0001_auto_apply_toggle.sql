-- Add auto_apply column to discounts table
ALTER TABLE "discounts" ADD COLUMN "auto_apply" BOOLEAN DEFAULT true NOT NULL;

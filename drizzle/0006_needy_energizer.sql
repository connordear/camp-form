ALTER TABLE "camps" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_email_unique" UNIQUE("email");
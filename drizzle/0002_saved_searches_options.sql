ALTER TABLE "saved_searches" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "saved_searches" ADD COLUMN "result_limit" integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_createdByEmail_query_category_unique" UNIQUE NULLS NOT DISTINCT("created_by_email","query","category");
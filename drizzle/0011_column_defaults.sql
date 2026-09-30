ALTER TABLE "columns" ADD COLUMN "default_in" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
UPDATE "columns" SET "default_in" = ARRAY['people', 'all'] WHERE "key" IN ('current_title', 'company', 'location');
--> statement-breakpoint
UPDATE "columns" SET "default_in" = ARRAY['people'] WHERE "key" IN ('linkedin_followers', 'email', 'phone');
--> statement-breakpoint
UPDATE "columns" SET "default_in" = ARRAY['company'] WHERE "key" IN ('industry', 'headcount', 'total_funding', 'headquarters');
--> statement-breakpoint
UPDATE "columns" SET "default_in" = ARRAY['company', 'all'] WHERE "key" = 'website';
--> statement-breakpoint
UPDATE "columns" SET "default_in" = ARRAY['all'] WHERE "key" = 'summary';

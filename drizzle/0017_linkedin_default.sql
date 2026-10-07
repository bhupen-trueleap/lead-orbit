UPDATE "columns" SET "default_in" = '{}' WHERE "key" IN ('website', 'summary');
--> statement-breakpoint
INSERT INTO "columns" ("key", "label", "type", "instruction", "category", "scope", "is_preset", "default_in", "sort_order") VALUES
  ('linkedin', 'LinkedIn', 'text', 'The LinkedIn profile or company page URL', NULL, 'entity', true, ARRAY['people', 'company', 'all', 'personal_site'], 150)
ON CONFLICT ("key") DO UPDATE SET
  "label" = EXCLUDED."label",
  "instruction" = EXCLUDED."instruction",
  "category" = EXCLUDED."category",
  "is_preset" = EXCLUDED."is_preset",
  "default_in" = EXCLUDED."default_in",
  "sort_order" = EXCLUDED."sort_order",
  "archived_at" = NULL;

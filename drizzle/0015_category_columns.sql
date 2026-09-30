INSERT INTO "columns" ("key", "label", "type", "instruction", "category", "scope", "is_preset", "default_in", "sort_order") VALUES
  ('author', 'Author', 'text', 'The author or byline of the article or document', NULL, 'entity', true, ARRAY['news', 'publication'], 210),
  ('published_date', 'Published date', 'text', 'The date it was published, formatted as YYYY-MM-DD', NULL, 'entity', true, ARRAY['news', 'publication', 'financial_report'], 220),
  ('publisher', 'Publisher', 'text', 'The outlet, journal, or organization that published it', NULL, 'entity', true, ARRAY['news', 'publication'], 230),
  ('report_company', 'Company reported on', 'text', 'The company this financial report or filing is about', NULL, 'entity', true, ARRAY['financial_report'], 240),
  ('reporting_period', 'Reporting period', 'text', 'The period the report covers, for example Q2 2026 or FY2025', NULL, 'entity', true, ARRAY['financial_report'], 250)
ON CONFLICT ("key") DO NOTHING;
--> statement-breakpoint
UPDATE "columns" SET "default_in" = array_cat("default_in", ARRAY['personal_site'])
WHERE "key" IN ('current_title', 'company', 'location') AND NOT ('personal_site' = ANY("default_in"));
--> statement-breakpoint
UPDATE "columns" SET "default_in" = array_cat("default_in", ARRAY['news', 'publication', 'personal_site', 'financial_report'])
WHERE "key" = 'summary' AND NOT ('news' = ANY("default_in"));

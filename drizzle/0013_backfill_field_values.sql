INSERT INTO "field_values" ("column_id", "entity_id", "value_text")
SELECT c."id", p."entity_id", trim(p."current_title")
FROM "people" p JOIN "columns" c ON c."key" = 'current_title'
WHERE nullif(trim(p."current_title"), '') IS NOT NULL
ON CONFLICT ON CONSTRAINT "field_values_slot_unique" DO NOTHING;
--> statement-breakpoint
INSERT INTO "field_values" ("column_id", "entity_id", "value_text")
SELECT c."id", p."entity_id", trim(p."current_company_name")
FROM "people" p JOIN "columns" c ON c."key" = 'company'
WHERE nullif(trim(p."current_company_name"), '') IS NOT NULL
ON CONFLICT ON CONSTRAINT "field_values_slot_unique" DO NOTHING;
--> statement-breakpoint
INSERT INTO "field_values" ("column_id", "entity_id", "value_text")
SELECT c."id", p."entity_id", trim(p."location")
FROM "people" p JOIN "columns" c ON c."key" = 'location'
WHERE nullif(trim(p."location"), '') IS NOT NULL
ON CONFLICT ON CONSTRAINT "field_values_slot_unique" DO NOTHING;
--> statement-breakpoint
INSERT INTO "field_values" ("column_id", "entity_id", "value_number")
SELECT c."id", co."entity_id", co."headcount"
FROM "companies" co JOIN "columns" c ON c."key" = 'headcount'
WHERE co."headcount" IS NOT NULL
ON CONFLICT ON CONSTRAINT "field_values_slot_unique" DO NOTHING;
--> statement-breakpoint
INSERT INTO "field_values" ("column_id", "entity_id", "value_number")
SELECT c."id", co."entity_id", co."funding_total"
FROM "companies" co JOIN "columns" c ON c."key" = 'total_funding'
WHERE co."funding_total" IS NOT NULL
ON CONFLICT ON CONSTRAINT "field_values_slot_unique" DO NOTHING;
--> statement-breakpoint
INSERT INTO "field_values" ("column_id", "entity_id", "value_text")
SELECT c."id", co."entity_id", concat_ws(', ', nullif(trim(co."hq_city"), ''), nullif(trim(co."hq_country"), ''))
FROM "companies" co JOIN "columns" c ON c."key" = 'headquarters'
WHERE nullif(trim(co."hq_city"), '') IS NOT NULL OR nullif(trim(co."hq_country"), '') IS NOT NULL
ON CONFLICT ON CONSTRAINT "field_values_slot_unique" DO NOTHING;
--> statement-breakpoint
INSERT INTO "field_values" ("column_id", "entity_id", "value_text")
SELECT c."id", e."id", e."url"
FROM "entities" e JOIN "columns" c ON c."key" = 'website'
WHERE e."type" = 'company' AND e."url" IS NOT NULL
ON CONFLICT ON CONSTRAINT "field_values_slot_unique" DO NOTHING;
--> statement-breakpoint
INSERT INTO "field_values" ("column_id", "entity_id", "value_number", "source_page_id")
SELECT DISTINCT ON (e."id") c."id", e."id",
  replace(substring(p."text" from '([0-9][0-9,]*)\s+followers'), ',', '')::double precision,
  p."id"
FROM "entities" e
JOIN "entity_pages" ep ON ep."entity_id" = e."id"
JOIN "web_pages" p ON p."id" = ep."page_id"
JOIN "columns" c ON c."key" = 'linkedin_followers'
WHERE e."type" = 'person' AND p."url" LIKE '%linkedin.com/in/%'
  AND p."text" ~ '[0-9][0-9,]*\s+followers'
ORDER BY e."id", p."fetched_at" DESC
ON CONFLICT ON CONSTRAINT "field_values_slot_unique" DO NOTHING;

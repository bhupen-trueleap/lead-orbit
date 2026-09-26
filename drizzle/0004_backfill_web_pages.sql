UPDATE "entities"
SET "url" = 'https://'
  || regexp_replace(lower(substring("url" from '^https?://([^/?#]+)')), '^(www\.|[a-z]{2}\.(?=linkedin\.com$))', '')
  || regexp_replace(coalesce(substring("url" from '^https?://[^/?#]+([^?#]*)'), ''), '/+$', '')
WHERE "url" ~ '^https?://';
--> statement-breakpoint
INSERT INTO "web_pages" ("url", "title", "highlights", "fetched_at", "created_at")
SELECT e."url", e."name",
  CASE WHEN a."value" IS NULL THEN '[]'::jsonb ELSE jsonb_build_array(a."value") END,
  e."updated_at", e."created_at"
FROM "entities" e
LEFT JOIN "entity_attributes" a ON a."entity_id" = e."id" AND a."key" = 'highlight'
WHERE e."url" IS NOT NULL
ON CONFLICT ("url") DO NOTHING;
--> statement-breakpoint
INSERT INTO "entity_pages" ("entity_id", "page_id", "role")
SELECT e."id", p."id", 'describes'
FROM "entities" e
JOIN "web_pages" p ON p."url" = e."url"
ON CONFLICT DO NOTHING;
--> statement-breakpoint
UPDATE "search_results" sr
SET "page_id" = p."id"
FROM "entities" e
JOIN "web_pages" p ON p."url" = e."url"
WHERE sr."entity_id" = e."id";
--> statement-breakpoint
UPDATE "search_results" sr
SET "rank" = ranked."rank"
FROM (
  SELECT "id", row_number() OVER (PARTITION BY "search_id" ORDER BY "entity_id") AS "rank"
  FROM "search_results"
) ranked
WHERE sr."id" = ranked."id";
--> statement-breakpoint
DELETE FROM "entity_attributes" WHERE "key" = 'highlight';

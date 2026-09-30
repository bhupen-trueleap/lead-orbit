ALTER TABLE "columns" ADD COLUMN "sort_order" integer DEFAULT 1000 NOT NULL;--> statement-breakpoint
UPDATE "columns" SET "sort_order" = CASE "key"
  WHEN 'current_title' THEN 10
  WHEN 'company' THEN 20
  WHEN 'location' THEN 30
  WHEN 'linkedin_followers' THEN 40
  WHEN 'email' THEN 50
  WHEN 'phone' THEN 60
  WHEN 'industry' THEN 110
  WHEN 'headcount' THEN 120
  WHEN 'total_funding' THEN 130
  WHEN 'headquarters' THEN 140
  WHEN 'website' THEN 150
  WHEN 'summary' THEN 200
  ELSE "sort_order"
END;

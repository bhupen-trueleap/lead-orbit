DROP TABLE "field_edits" CASCADE;--> statement-breakpoint
DROP TABLE "list_columns" CASCADE;--> statement-breakpoint
DROP TABLE "list_items" CASCADE;--> statement-breakpoint
DROP TABLE "list_values" CASCADE;--> statement-breakpoint
ALTER TABLE "lists" ADD COLUMN "workbook" jsonb;--> statement-breakpoint
ALTER TABLE "lists" ADD COLUMN "row_count" integer DEFAULT 0 NOT NULL;
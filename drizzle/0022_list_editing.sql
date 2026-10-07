CREATE TABLE "field_edits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"field" text NOT NULL,
	"old_value" jsonb,
	"new_value" jsonb,
	"edited_by_email" text NOT NULL,
	"list_id" uuid,
	"edited_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "list_values" (
	"item_id" uuid NOT NULL,
	"list_column_id" uuid NOT NULL,
	"value_text" text,
	"value_number" double precision,
	"value_boolean" boolean,
	"updated_by_email" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "list_values_item_id_list_column_id_pk" PRIMARY KEY("item_id","list_column_id")
);
--> statement-breakpoint
ALTER TABLE "field_edits" ADD CONSTRAINT "field_edits_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_edits" ADD CONSTRAINT "field_edits_list_id_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."lists"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "list_values" ADD CONSTRAINT "list_values_item_id_list_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."list_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "list_values" ADD CONSTRAINT "list_values_list_column_id_list_columns_id_fk" FOREIGN KEY ("list_column_id") REFERENCES "public"."list_columns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "field_edits_entity_id_edited_at_index" ON "field_edits" USING btree ("entity_id","edited_at");--> statement-breakpoint
CREATE INDEX "list_values_list_column_id_index" ON "list_values" USING btree ("list_column_id");
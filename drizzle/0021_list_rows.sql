CREATE TABLE "list_columns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"list_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"column_id" uuid,
	"label" text,
	"type" text,
	"options" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "list_columns_listId_columnId_unique" UNIQUE("list_id","column_id"),
	CONSTRAINT "list_columns_kind_check" CHECK (kind in ('data', 'tracking')),
	CONSTRAINT "list_columns_shape_check" CHECK ((kind = 'data' and "list_columns"."column_id" is not null) or (kind = 'tracking' and "list_columns"."label" is not null and "list_columns"."type" in ('text', 'number', 'date', 'checkbox', 'select')))
);
--> statement-breakpoint
CREATE TABLE "list_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"list_id" uuid NOT NULL,
	"entity_id" uuid,
	"draft" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"added_by_email" text NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "list_items_listId_entityId_unique" UNIQUE("list_id","entity_id")
);
--> statement-breakpoint
ALTER TABLE "list_columns" ADD CONSTRAINT "list_columns_list_id_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "list_columns" ADD CONSTRAINT "list_columns_column_id_columns_id_fk" FOREIGN KEY ("column_id") REFERENCES "public"."columns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "list_items" ADD CONSTRAINT "list_items_list_id_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "list_items" ADD CONSTRAINT "list_items_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "list_columns_list_id_position_index" ON "list_columns" USING btree ("list_id","position");--> statement-breakpoint
CREATE INDEX "list_items_list_id_added_at_index" ON "list_items" USING btree ("list_id","added_at");--> statement-breakpoint
CREATE INDEX "list_items_entity_id_index" ON "list_items" USING btree ("entity_id");
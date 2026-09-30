CREATE TABLE "columns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"type" text NOT NULL,
	"instruction" text NOT NULL,
	"category" text,
	"scope" text NOT NULL,
	"is_preset" boolean DEFAULT false NOT NULL,
	"archived_at" timestamp with time zone,
	"created_by_email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "columns_key_unique" UNIQUE("key"),
	CONSTRAINT "columns_type_check" CHECK (type in ('text', 'number', 'boolean')),
	CONSTRAINT "columns_scope_check" CHECK (scope in ('entity', 'search'))
);
--> statement-breakpoint
CREATE TABLE "field_values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"column_id" uuid NOT NULL,
	"entity_id" uuid,
	"page_id" uuid,
	"search_id" uuid,
	"value_text" text,
	"value_number" double precision,
	"value_boolean" boolean,
	"source_page_id" uuid,
	"extracted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "field_values_slot_unique" UNIQUE NULLS NOT DISTINCT("column_id","entity_id","page_id","search_id"),
	CONSTRAINT "field_values_target_check" CHECK (num_nonnulls("field_values"."entity_id", "field_values"."page_id") = 1),
	CONSTRAINT "field_values_value_check" CHECK (num_nonnulls("field_values"."value_text", "field_values"."value_number", "field_values"."value_boolean") = 1)
);
--> statement-breakpoint
CREATE TABLE "saved_search_columns" (
	"saved_search_id" uuid NOT NULL,
	"column_id" uuid NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "saved_search_columns_saved_search_id_column_id_pk" PRIMARY KEY("saved_search_id","column_id")
);
--> statement-breakpoint
CREATE TABLE "search_columns" (
	"search_id" uuid NOT NULL,
	"column_id" uuid NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "search_columns_search_id_column_id_pk" PRIMARY KEY("search_id","column_id")
);
--> statement-breakpoint
ALTER TABLE "field_values" ADD CONSTRAINT "field_values_column_id_columns_id_fk" FOREIGN KEY ("column_id") REFERENCES "public"."columns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_values" ADD CONSTRAINT "field_values_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_values" ADD CONSTRAINT "field_values_page_id_web_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."web_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_values" ADD CONSTRAINT "field_values_search_id_searches_id_fk" FOREIGN KEY ("search_id") REFERENCES "public"."searches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_values" ADD CONSTRAINT "field_values_source_page_id_web_pages_id_fk" FOREIGN KEY ("source_page_id") REFERENCES "public"."web_pages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_search_columns" ADD CONSTRAINT "saved_search_columns_saved_search_id_saved_searches_id_fk" FOREIGN KEY ("saved_search_id") REFERENCES "public"."saved_searches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_search_columns" ADD CONSTRAINT "saved_search_columns_column_id_columns_id_fk" FOREIGN KEY ("column_id") REFERENCES "public"."columns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_columns" ADD CONSTRAINT "search_columns_search_id_searches_id_fk" FOREIGN KEY ("search_id") REFERENCES "public"."searches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_columns" ADD CONSTRAINT "search_columns_column_id_columns_id_fk" FOREIGN KEY ("column_id") REFERENCES "public"."columns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "field_values_column_id_value_number_index" ON "field_values" USING btree ("column_id","value_number");--> statement-breakpoint
CREATE INDEX "field_values_column_id_value_text_index" ON "field_values" USING btree ("column_id","value_text");--> statement-breakpoint
CREATE INDEX "field_values_column_id_value_boolean_index" ON "field_values" USING btree ("column_id","value_boolean");--> statement-breakpoint
CREATE INDEX "field_values_entity_id_index" ON "field_values" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "field_values_page_id_index" ON "field_values" USING btree ("page_id");--> statement-breakpoint
CREATE INDEX "field_values_search_id_index" ON "field_values" USING btree ("search_id");
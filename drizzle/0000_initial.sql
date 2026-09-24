CREATE TABLE "entities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"name" text NOT NULL,
	"url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entities_url_unique" UNIQUE("url")
);
--> statement-breakpoint
CREATE TABLE "entity_attributes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entity_attributes_entityId_key_unique" UNIQUE("entity_id","key")
);
--> statement-breakpoint
CREATE TABLE "saved_searches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"query" text NOT NULL,
	"created_by_email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "search_results" (
	"search_id" uuid NOT NULL,
	"entity_id" uuid NOT NULL,
	CONSTRAINT "search_results_search_id_entity_id_pk" PRIMARY KEY("search_id","entity_id")
);
--> statement-breakpoint
CREATE TABLE "searches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"query" text NOT NULL,
	"created_by_email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "entity_attributes" ADD CONSTRAINT "entity_attributes_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_results" ADD CONSTRAINT "search_results_search_id_searches_id_fk" FOREIGN KEY ("search_id") REFERENCES "public"."searches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_results" ADD CONSTRAINT "search_results_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "entities_type_index" ON "entities" USING btree ("type");--> statement-breakpoint
CREATE INDEX "entities_name_index" ON "entities" USING btree ("name");--> statement-breakpoint
CREATE INDEX "saved_searches_created_by_email_index" ON "saved_searches" USING btree ("created_by_email");--> statement-breakpoint
CREATE INDEX "search_results_entity_id_index" ON "search_results" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "searches_created_by_email_created_at_index" ON "searches" USING btree ("created_by_email","created_at");
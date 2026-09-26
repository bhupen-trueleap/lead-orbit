CREATE TABLE "companies" (
	"entity_id" uuid PRIMARY KEY NOT NULL,
	"founded_year" integer,
	"headcount" integer,
	"hq_address" text,
	"hq_city" text,
	"hq_country" text,
	"revenue_annual" bigint,
	"funding_total" bigint,
	"latest_round_name" text,
	"latest_round_date" date,
	"latest_round_amount" bigint,
	"monthly_visits" bigint
);
--> statement-breakpoint
CREATE TABLE "entity_pages" (
	"entity_id" uuid NOT NULL,
	"page_id" uuid NOT NULL,
	"role" text DEFAULT 'describes' NOT NULL,
	CONSTRAINT "entity_pages_entity_id_page_id_pk" PRIMARY KEY("entity_id","page_id")
);
--> statement-breakpoint
CREATE TABLE "exa_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"search_id" uuid,
	"exa_request_id" text,
	"request" jsonb NOT NULL,
	"resolved_search_type" text,
	"cost_dollars" double precision,
	"search_time_ms" double precision,
	"result_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "people" (
	"entity_id" uuid PRIMARY KEY NOT NULL,
	"first_name" text,
	"last_name" text,
	"location" text,
	"current_title" text,
	"current_company_name" text,
	"current_company_exa_id" text,
	"seniority" text
);
--> statement-breakpoint
CREATE TABLE "positions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"person_id" uuid NOT NULL,
	"company_exa_id" text,
	"company_name" text,
	"title" text,
	"location" text,
	"start_date" date,
	"end_date" date,
	"is_current" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "web_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"exa_id" text,
	"title" text,
	"author" text,
	"published_date" timestamp with time zone,
	"image" text,
	"favicon" text,
	"text" text,
	"highlights" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(text, ''))) STORED,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "web_pages_url_unique" UNIQUE("url")
);
--> statement-breakpoint
ALTER TABLE "search_results" DROP CONSTRAINT "search_results_search_id_entity_id_pk";--> statement-breakpoint
ALTER TABLE "search_results" ALTER COLUMN "entity_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN "exa_entity_id" text;--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN "properties" jsonb;--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN "version" integer;--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN "search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))) STORED;--> statement-breakpoint
ALTER TABLE "entity_attributes" ADD COLUMN "value_number" double precision;--> statement-breakpoint
ALTER TABLE "search_results" ADD COLUMN "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "search_results" ADD COLUMN "page_id" uuid;--> statement-breakpoint
ALTER TABLE "search_results" ADD COLUMN "rank" integer;--> statement-breakpoint
ALTER TABLE "search_results" ADD COLUMN "source" text;--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_pages" ADD CONSTRAINT "entity_pages_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_pages" ADD CONSTRAINT "entity_pages_page_id_web_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."web_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exa_requests" ADD CONSTRAINT "exa_requests_search_id_searches_id_fk" FOREIGN KEY ("search_id") REFERENCES "public"."searches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "positions" ADD CONSTRAINT "positions_person_id_entities_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "companies_headcount_index" ON "companies" USING btree ("headcount");--> statement-breakpoint
CREATE INDEX "companies_funding_total_index" ON "companies" USING btree ("funding_total");--> statement-breakpoint
CREATE INDEX "companies_hq_city_index" ON "companies" USING btree ("hq_city");--> statement-breakpoint
CREATE INDEX "entity_pages_page_id_index" ON "entity_pages" USING btree ("page_id");--> statement-breakpoint
CREATE INDEX "exa_requests_search_id_index" ON "exa_requests" USING btree ("search_id");--> statement-breakpoint
CREATE INDEX "exa_requests_created_at_index" ON "exa_requests" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "people_seniority_index" ON "people" USING btree ("seniority");--> statement-breakpoint
CREATE INDEX "people_location_index" ON "people" USING btree ("location");--> statement-breakpoint
CREATE INDEX "positions_person_id_index" ON "positions" USING btree ("person_id");--> statement-breakpoint
CREATE INDEX "positions_company_exa_id_index" ON "positions" USING btree ("company_exa_id");--> statement-breakpoint
CREATE INDEX "web_pages_search_vector_index" ON "web_pages" USING gin ("search_vector");--> statement-breakpoint
ALTER TABLE "search_results" ADD CONSTRAINT "search_results_page_id_web_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."web_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "entities_search_vector_index" ON "entities" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "search_results_page_id_index" ON "search_results" USING btree ("page_id");--> statement-breakpoint
ALTER TABLE "entities" ADD CONSTRAINT "entities_exaEntityId_unique" UNIQUE("exa_entity_id");--> statement-breakpoint
ALTER TABLE "search_results" ADD CONSTRAINT "search_results_searchId_entityId_unique" UNIQUE("search_id","entity_id");--> statement-breakpoint
ALTER TABLE "search_results" ADD CONSTRAINT "search_results_searchId_pageId_unique" UNIQUE("search_id","page_id");
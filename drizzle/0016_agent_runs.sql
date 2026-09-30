CREATE TABLE "agent_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"search_id" uuid NOT NULL,
	"exa_run_id" text NOT NULL,
	"effort" text NOT NULL,
	"status" text NOT NULL,
	"stop_reason" text,
	"cost_dollars" double precision,
	"usage" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "agent_runs_searchId_unique" UNIQUE("search_id"),
	CONSTRAINT "agent_runs_exaRunId_unique" UNIQUE("exa_run_id")
);
--> statement-breakpoint
ALTER TABLE "field_values" ADD COLUMN "citations" jsonb;--> statement-breakpoint
ALTER TABLE "field_values" ADD COLUMN "confidence" text;--> statement-breakpoint
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_search_id_searches_id_fk" FOREIGN KEY ("search_id") REFERENCES "public"."searches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_runs_status_index" ON "agent_runs" USING btree ("status");
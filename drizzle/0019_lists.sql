CREATE TABLE "lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_email" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lists_ownerEmail_name_unique" UNIQUE("owner_email","name")
);
--> statement-breakpoint
CREATE INDEX "lists_owner_email_updated_at_index" ON "lists" USING btree ("owner_email","updated_at");
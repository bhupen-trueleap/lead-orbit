CREATE TABLE "auth_invite" (
	"email" text PRIMARY KEY NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

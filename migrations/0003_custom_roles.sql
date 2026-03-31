CREATE TABLE IF NOT EXISTS "custom_roles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"permissions" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "custom_roles_name_unique" UNIQUE("name")
);

import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_analytics_device_type" AS ENUM('desktop', 'mobile', 'tablet');
  CREATE TYPE "public"."enum_analytics_event_type" AS ENUM('page_view', 'click', 'form_submission', 'error', 'unknown');
  CREATE TABLE IF NOT EXISTS "analytics" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"ip" varchar,
  	"email" varchar,
  	"phone" varchar,
  	"device_type" "enum_analytics_device_type" NOT NULL,
  	"page_path" varchar NOT NULL,
  	"referrer" varchar,
  	"clicked_url" varchar,
  	"event_type" "enum_analytics_event_type" NOT NULL,
  	"timestamp" timestamp(3) with time zone NOT NULL,
  	"payload" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "analytics_id" integer;
  CREATE INDEX IF NOT EXISTS "analytics_updated_at_idx" ON "analytics" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "analytics_created_at_idx" ON "analytics" USING btree ("created_at");
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_analytics_fk" FOREIGN KEY ("analytics_id") REFERENCES "public"."analytics"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_analytics_id_idx" ON "payload_locked_documents_rels" USING btree ("analytics_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "analytics" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "analytics" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_analytics_fk";
  
  DROP INDEX IF EXISTS "payload_locked_documents_rels_analytics_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "analytics_id";
  DROP TYPE "public"."enum_analytics_device_type";
  DROP TYPE "public"."enum_analytics_event_type";`)
}

import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE IF NOT EXISTS "roles_permissions_collections" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"collection" varchar NOT NULL,
  	"can_create" boolean DEFAULT false,
  	"can_read" boolean DEFAULT true,
  	"can_update" boolean DEFAULT false,
  	"can_delete" boolean DEFAULT false
  );
  
  CREATE TABLE IF NOT EXISTS "roles_permissions_globals" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"global" varchar,
  	"can_read" boolean DEFAULT true,
  	"can_update" boolean DEFAULT false
  );
  
  CREATE TABLE IF NOT EXISTS "roles" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"description" varchar,
  	"is_admin" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "users" ADD COLUMN "role_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "roles_id" integer;
  DO $$ BEGIN
   ALTER TABLE "roles_permissions_collections" ADD CONSTRAINT "roles_permissions_collections_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "roles_permissions_globals" ADD CONSTRAINT "roles_permissions_globals_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  CREATE INDEX IF NOT EXISTS "roles_permissions_collections_order_idx" ON "roles_permissions_collections" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "roles_permissions_collections_parent_id_idx" ON "roles_permissions_collections" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "roles_permissions_globals_order_idx" ON "roles_permissions_globals" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "roles_permissions_globals_parent_id_idx" ON "roles_permissions_globals" USING btree ("_parent_id");
  CREATE UNIQUE INDEX IF NOT EXISTS "roles_name_idx" ON "roles" USING btree ("name");
  CREATE UNIQUE INDEX IF NOT EXISTS "roles_slug_idx" ON "roles" USING btree ("slug");
  CREATE INDEX IF NOT EXISTS "roles_updated_at_idx" ON "roles" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "roles_created_at_idx" ON "roles" USING btree ("created_at");
  DO $$ BEGIN
   ALTER TABLE "users" ADD CONSTRAINT "users_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_roles_fk" FOREIGN KEY ("roles_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users" USING btree ("role_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_roles_id_idx" ON "payload_locked_documents_rels" USING btree ("roles_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "roles_permissions_collections" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "roles_permissions_globals" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "roles" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "roles_permissions_collections" CASCADE;
  DROP TABLE "roles_permissions_globals" CASCADE;
  DROP TABLE "roles" CASCADE;
  ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_role_id_roles_id_fk";  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_roles_fk";
  
  DROP INDEX IF EXISTS "users_role_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_roles_id_idx";
  ALTER TABLE "users" DROP COLUMN IF EXISTS "role_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "roles_id";`)
}

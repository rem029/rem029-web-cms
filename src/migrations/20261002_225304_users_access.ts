import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_access_access_slug" AS ENUM('pages', 'posts', 'media', 'categories', 'users', 'users-access', 'roles', 'analytics', 'tenants', 'header', 'footer', 'theme', 'settings', 'redirects', 'forms', 'form-submissions', 'search');
  CREATE TABLE "users_access_access" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"slug" "enum_users_access_access_slug" NOT NULL,
  	"hidden" boolean DEFAULT false,
  	"read" boolean DEFAULT false,
  	"create" boolean DEFAULT false,
  	"update" boolean DEFAULT false,
  	"delete" boolean DEFAULT false,
  	"admin" boolean DEFAULT false,
  	"access" boolean DEFAULT false
  );
  
  CREATE TABLE "users_access" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"description" varchar,
  	"created_by_id" integer,
  	"updated_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "users" ADD COLUMN "access_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "users_access_id" integer;
  ALTER TABLE "users_access_access" ADD CONSTRAINT "users_access_access_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users_access"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users_access" ADD CONSTRAINT "users_access_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "users_access" ADD CONSTRAINT "users_access_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "users_access_access_order_idx" ON "users_access_access" USING btree ("_order");
  CREATE INDEX "users_access_access_parent_id_idx" ON "users_access_access" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "users_access_name_idx" ON "users_access" USING btree ("name");
  CREATE UNIQUE INDEX "users_access_slug_idx" ON "users_access" USING btree ("slug");
  CREATE INDEX "users_access_created_by_idx" ON "users_access" USING btree ("created_by_id");
  CREATE INDEX "users_access_updated_by_idx" ON "users_access" USING btree ("updated_by_id");
  CREATE INDEX "users_access_updated_at_idx" ON "users_access" USING btree ("updated_at");
  CREATE INDEX "users_access_created_at_idx" ON "users_access" USING btree ("created_at");
  ALTER TABLE "users" ADD CONSTRAINT "users_access_id_users_access_id_fk" FOREIGN KEY ("access_id") REFERENCES "public"."users_access"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_access_fk" FOREIGN KEY ("users_access_id") REFERENCES "public"."users_access"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_access_idx" ON "users" USING btree ("access_id");
  CREATE INDEX "payload_locked_documents_rels_users_access_id_idx" ON "payload_locked_documents_rels" USING btree ("users_access_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  // generated order dropped the tables (CASCADE removes these FKs) before the FKs, which fails:
  // drop the FKs first
  await db.execute(sql`
   ALTER TABLE "users" DROP CONSTRAINT "users_access_id_users_access_id_fk";
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_users_access_fk";
  ALTER TABLE "users_access_access" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "users_access" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "users_access_access" CASCADE;
  DROP TABLE "users_access" CASCADE;
  DROP INDEX "users_access_idx";
  DROP INDEX "payload_locked_documents_rels_users_access_id_idx";
  ALTER TABLE "users" DROP COLUMN "access_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "users_access_id";
  DROP TYPE "public"."enum_users_access_access_slug";`)
}

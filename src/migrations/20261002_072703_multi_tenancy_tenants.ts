import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  -- 1. Create tables
  CREATE TABLE IF NOT EXISTS "tenants" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar NOT NULL,
  	"is_active" boolean DEFAULT true,
  	"created_by_id" integer,
  	"updated_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE IF NOT EXISTS "tenants_locales" (
  	"name" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );

  CREATE TABLE IF NOT EXISTS "tenants_domains" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"domain" varchar NOT NULL
  );

  CREATE TABLE IF NOT EXISTS "users_tenants" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"tenant_id" integer NOT NULL
  );

  -- 2. Add nullable tenant columns to existing tables
  ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "tenant_id" integer;
  ALTER TABLE "_pages_v" ADD COLUMN IF NOT EXISTS "version_tenant_id" integer;
  ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "tenant_id" integer;
  ALTER TABLE "_posts_v" ADD COLUMN IF NOT EXISTS "version_tenant_id" integer;
  ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "tenant_id" integer;
  ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "tenant_id" integer;
  ALTER TABLE "analytics" ADD COLUMN IF NOT EXISTS "tenant_id" integer;
  ALTER TABLE "redirects" ADD COLUMN IF NOT EXISTS "tenant_id" integer;
  ALTER TABLE "forms" ADD COLUMN IF NOT EXISTS "tenant_id" integer;
  ALTER TABLE "form_submissions" ADD COLUMN IF NOT EXISTS "tenant_id" integer;
  ALTER TABLE "search" ADD COLUMN IF NOT EXISTS "tenant_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "tenants_id" integer;

  -- 3. Insert default tenant idempotently before FKs/indexes that need data
  INSERT INTO "tenants" ("slug", "is_active", "created_at", "updated_at")
  SELECT 'admin', true, now(), now()
  WHERE NOT EXISTS (
    SELECT 1 FROM "tenants" WHERE "slug" = 'admin'
  );

  INSERT INTO "tenants_locales" ("name", "_locale", "_parent_id")
  SELECT 'Admin', 'en'::"_locales", t."id"
  FROM "tenants" t
  WHERE t."slug" = 'admin'
    AND NOT EXISTS (
      SELECT 1 FROM "tenants_locales" tl
      WHERE tl."_parent_id" = t."id" AND tl."_locale" = 'en'::"_locales"
    );

  -- 4. Backfill tenant_id on main tables to default admin tenant
  UPDATE "pages" SET "tenant_id" = (SELECT "id" FROM "tenants" WHERE "slug" = 'admin') WHERE "tenant_id" IS NULL;
  UPDATE "posts" SET "tenant_id" = (SELECT "id" FROM "tenants" WHERE "slug" = 'admin') WHERE "tenant_id" IS NULL;
  UPDATE "media" SET "tenant_id" = (SELECT "id" FROM "tenants" WHERE "slug" = 'admin') WHERE "tenant_id" IS NULL;
  UPDATE "categories" SET "tenant_id" = (SELECT "id" FROM "tenants" WHERE "slug" = 'admin') WHERE "tenant_id" IS NULL;
  UPDATE "analytics" SET "tenant_id" = (SELECT "id" FROM "tenants" WHERE "slug" = 'admin') WHERE "tenant_id" IS NULL;
  UPDATE "redirects" SET "tenant_id" = (SELECT "id" FROM "tenants" WHERE "slug" = 'admin') WHERE "tenant_id" IS NULL;
  UPDATE "forms" SET "tenant_id" = (SELECT "id" FROM "tenants" WHERE "slug" = 'admin') WHERE "tenant_id" IS NULL;
  UPDATE "form_submissions" SET "tenant_id" = (SELECT "id" FROM "tenants" WHERE "slug" = 'admin') WHERE "tenant_id" IS NULL;
  UPDATE "search" SET "tenant_id" = (SELECT "id" FROM "tenants" WHERE "slug" = 'admin') WHERE "tenant_id" IS NULL;

  -- 5. Backfill versions tables (kept nullable)
  UPDATE "_pages_v" SET "version_tenant_id" = (SELECT "id" FROM "tenants" WHERE "slug" = 'admin') WHERE "version_tenant_id" IS NULL;
  UPDATE "_posts_v" SET "version_tenant_id" = (SELECT "id" FROM "tenants" WHERE "slug" = 'admin') WHERE "version_tenant_id" IS NULL;

  -- 6. Enforce NOT NULL on main tables
  -- NOT NULL is DB-only on purpose; the config field isn't required because the plugin fills it in beforeChange
  ALTER TABLE "pages" ALTER COLUMN "tenant_id" SET NOT NULL;
  ALTER TABLE "posts" ALTER COLUMN "tenant_id" SET NOT NULL;
  ALTER TABLE "media" ALTER COLUMN "tenant_id" SET NOT NULL;
  ALTER TABLE "categories" ALTER COLUMN "tenant_id" SET NOT NULL;
  ALTER TABLE "analytics" ALTER COLUMN "tenant_id" SET NOT NULL;
  ALTER TABLE "redirects" ALTER COLUMN "tenant_id" SET NOT NULL;
  ALTER TABLE "forms" ALTER COLUMN "tenant_id" SET NOT NULL;
  ALTER TABLE "form_submissions" ALTER COLUMN "tenant_id" SET NOT NULL;
  ALTER TABLE "search" ALTER COLUMN "tenant_id" SET NOT NULL;

  -- 7. Insert users_tenants row for every existing user -> admin tenant
  INSERT INTO "users_tenants" ("_order", "_parent_id", "id", "tenant_id")
  SELECT
    1,
    u."id",
    substr(md5(random()::text || clock_timestamp()::text || u."id"::text), 1, 24),
    t."id"
  FROM "users" u
  CROSS JOIN (SELECT "id" FROM "tenants" WHERE "slug" = 'admin') t
  WHERE NOT EXISTS (
    SELECT 1 FROM "users_tenants" ut
    WHERE ut."_parent_id" = u."id" AND ut."tenant_id" = t."id"
  );

  -- 8a. slugs / redirect sources were not unique before; the new (tenant, slug) indexes would fail
  -- on existing duplicates. keep the oldest row and suffix the others with "-<id>" (no data lost).
  DO $$
  DECLARE n integer;
  BEGIN
    UPDATE "pages" t SET "slug" = t."slug" || '-' || t."id"
    FROM (SELECT "id", row_number() OVER (PARTITION BY "tenant_id", "slug" ORDER BY "id") AS rn
          FROM "pages" WHERE "slug" IS NOT NULL) d
    WHERE t."id" = d."id" AND d.rn > 1;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n > 0 THEN RAISE NOTICE 'multi_tenancy: renamed % duplicate page slug(s)', n; END IF;

    UPDATE "posts" t SET "slug" = t."slug" || '-' || t."id"
    FROM (SELECT "id", row_number() OVER (PARTITION BY "tenant_id", "slug" ORDER BY "id") AS rn
          FROM "posts" WHERE "slug" IS NOT NULL) d
    WHERE t."id" = d."id" AND d.rn > 1;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n > 0 THEN RAISE NOTICE 'multi_tenancy: renamed % duplicate post slug(s)', n; END IF;

    UPDATE "categories" t SET "slug" = t."slug" || '-' || t."id"
    FROM (SELECT "id", row_number() OVER (PARTITION BY "tenant_id", "slug" ORDER BY "id") AS rn
          FROM "categories" WHERE "slug" IS NOT NULL) d
    WHERE t."id" = d."id" AND d.rn > 1;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n > 0 THEN RAISE NOTICE 'multi_tenancy: renamed % duplicate category slug(s)', n; END IF;

    UPDATE "redirects" t SET "from" = t."from" || '-' || t."id"
    FROM (SELECT "id", row_number() OVER (PARTITION BY "tenant_id", "from" ORDER BY "id") AS rn
          FROM "redirects") d
    WHERE t."id" = d."id" AND d.rn > 1;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n > 0 THEN RAISE NOTICE 'multi_tenancy: renamed % duplicate redirect source(s)', n; END IF;
  END $$;

  -- 8. Add foreign keys
  ALTER TABLE "users_tenants" ADD CONSTRAINT "users_tenants_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "users_tenants" ADD CONSTRAINT "users_tenants_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tenants_domains" ADD CONSTRAINT "tenants_domains_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tenants" ADD CONSTRAINT "tenants_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tenants" ADD CONSTRAINT "tenants_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tenants_locales" ADD CONSTRAINT "tenants_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages" ADD CONSTRAINT "pages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_version_tenant_id_tenants_id_fk" FOREIGN KEY ("version_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts" ADD CONSTRAINT "posts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v" ADD CONSTRAINT "_posts_v_version_tenant_id_tenants_id_fk" FOREIGN KEY ("version_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "media" ADD CONSTRAINT "media_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories" ADD CONSTRAINT "categories_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "analytics" ADD CONSTRAINT "analytics_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "redirects" ADD CONSTRAINT "redirects_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "forms" ADD CONSTRAINT "forms_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "search" ADD CONSTRAINT "search_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tenants_fk" FOREIGN KEY ("tenants_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;

  -- 9. Create indexes (including compound unique indexes created after backfill)
  CREATE INDEX IF NOT EXISTS "users_tenants_order_idx" ON "users_tenants" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "users_tenants_parent_id_idx" ON "users_tenants" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "users_tenants_tenant_idx" ON "users_tenants" USING btree ("tenant_id");
  CREATE INDEX IF NOT EXISTS "tenants_domains_order_idx" ON "tenants_domains" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "tenants_domains_parent_id_idx" ON "tenants_domains" USING btree ("_parent_id");
  CREATE UNIQUE INDEX IF NOT EXISTS "tenants_domains_domain_idx" ON "tenants_domains" USING btree ("domain");
  CREATE UNIQUE INDEX IF NOT EXISTS "tenants_slug_idx" ON "tenants" USING btree ("slug");
  CREATE INDEX IF NOT EXISTS "tenants_created_by_idx" ON "tenants" USING btree ("created_by_id");
  CREATE INDEX IF NOT EXISTS "tenants_updated_by_idx" ON "tenants" USING btree ("updated_by_id");
  CREATE INDEX IF NOT EXISTS "tenants_updated_at_idx" ON "tenants" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "tenants_created_at_idx" ON "tenants" USING btree ("created_at");
  CREATE UNIQUE INDEX IF NOT EXISTS "tenants_locales_locale_parent_id_unique" ON "tenants_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX IF NOT EXISTS "pages_tenant_idx" ON "pages" USING btree ("tenant_id");
  CREATE UNIQUE INDEX IF NOT EXISTS "tenant_slug_idx" ON "pages" USING btree ("tenant_id","slug");
  CREATE INDEX IF NOT EXISTS "_pages_v_version_version_tenant_idx" ON "_pages_v" USING btree ("version_tenant_id");
  CREATE INDEX IF NOT EXISTS "version_tenant_version_slug_idx" ON "_pages_v" USING btree ("version_tenant_id","version_slug");
  CREATE INDEX IF NOT EXISTS "posts_tenant_idx" ON "posts" USING btree ("tenant_id");
  CREATE UNIQUE INDEX IF NOT EXISTS "tenant_slug_1_idx" ON "posts" USING btree ("tenant_id","slug");
  CREATE INDEX IF NOT EXISTS "_posts_v_version_version_tenant_idx" ON "_posts_v" USING btree ("version_tenant_id");
  CREATE INDEX IF NOT EXISTS "version_tenant_version_slug_1_idx" ON "_posts_v" USING btree ("version_tenant_id","version_slug");
  CREATE INDEX IF NOT EXISTS "media_tenant_idx" ON "media" USING btree ("tenant_id");
  CREATE INDEX IF NOT EXISTS "categories_tenant_idx" ON "categories" USING btree ("tenant_id");
  CREATE UNIQUE INDEX IF NOT EXISTS "tenant_slug_2_idx" ON "categories" USING btree ("tenant_id","slug");
  CREATE INDEX IF NOT EXISTS "analytics_tenant_idx" ON "analytics" USING btree ("tenant_id");
  CREATE INDEX IF NOT EXISTS "redirects_tenant_idx" ON "redirects" USING btree ("tenant_id");
  CREATE UNIQUE INDEX IF NOT EXISTS "tenant_from_idx" ON "redirects" USING btree ("tenant_id","from");
  CREATE INDEX IF NOT EXISTS "forms_tenant_idx" ON "forms" USING btree ("tenant_id");
  CREATE INDEX IF NOT EXISTS "form_submissions_tenant_idx" ON "form_submissions" USING btree ("tenant_id");
  CREATE INDEX IF NOT EXISTS "search_tenant_idx" ON "search" USING btree ("tenant_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_tenants_id_idx" ON "payload_locked_documents_rels" USING btree ("tenants_id");
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "users_tenants" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "tenants_domains" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "tenants" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "tenants_locales" DISABLE ROW LEVEL SECURITY;

  DROP TABLE IF EXISTS "users_tenants" CASCADE;
  DROP TABLE IF EXISTS "tenants_domains" CASCADE;
  DROP TABLE IF EXISTS "tenants" CASCADE;
  DROP TABLE IF EXISTS "tenants_locales" CASCADE;

  ALTER TABLE "pages" DROP CONSTRAINT IF EXISTS "pages_tenant_id_tenants_id_fk";
  ALTER TABLE "_pages_v" DROP CONSTRAINT IF EXISTS "_pages_v_version_tenant_id_tenants_id_fk";
  ALTER TABLE "posts" DROP CONSTRAINT IF EXISTS "posts_tenant_id_tenants_id_fk";
  ALTER TABLE "_posts_v" DROP CONSTRAINT IF EXISTS "_posts_v_version_tenant_id_tenants_id_fk";
  ALTER TABLE "media" DROP CONSTRAINT IF EXISTS "media_tenant_id_tenants_id_fk";
  ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "categories_tenant_id_tenants_id_fk";
  ALTER TABLE "analytics" DROP CONSTRAINT IF EXISTS "analytics_tenant_id_tenants_id_fk";
  ALTER TABLE "redirects" DROP CONSTRAINT IF EXISTS "redirects_tenant_id_tenants_id_fk";
  ALTER TABLE "forms" DROP CONSTRAINT IF EXISTS "forms_tenant_id_tenants_id_fk";
  ALTER TABLE "form_submissions" DROP CONSTRAINT IF EXISTS "form_submissions_tenant_id_tenants_id_fk";
  ALTER TABLE "search" DROP CONSTRAINT IF EXISTS "search_tenant_id_tenants_id_fk";
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_tenants_fk";

  DROP INDEX IF EXISTS "pages_tenant_idx";
  DROP INDEX IF EXISTS "tenant_slug_idx";
  DROP INDEX IF EXISTS "_pages_v_version_version_tenant_idx";
  DROP INDEX IF EXISTS "version_tenant_version_slug_idx";
  DROP INDEX IF EXISTS "posts_tenant_idx";
  DROP INDEX IF EXISTS "tenant_slug_1_idx";
  DROP INDEX IF EXISTS "_posts_v_version_version_tenant_idx";
  DROP INDEX IF EXISTS "version_tenant_version_slug_1_idx";
  DROP INDEX IF EXISTS "media_tenant_idx";
  DROP INDEX IF EXISTS "categories_tenant_idx";
  DROP INDEX IF EXISTS "tenant_slug_2_idx";
  DROP INDEX IF EXISTS "analytics_tenant_idx";
  DROP INDEX IF EXISTS "redirects_tenant_idx";
  DROP INDEX IF EXISTS "tenant_from_idx";
  DROP INDEX IF EXISTS "forms_tenant_idx";
  DROP INDEX IF EXISTS "form_submissions_tenant_idx";
  DROP INDEX IF EXISTS "search_tenant_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_tenants_id_idx";

  ALTER TABLE "pages" DROP COLUMN IF EXISTS "tenant_id";
  ALTER TABLE "_pages_v" DROP COLUMN IF EXISTS "version_tenant_id";
  ALTER TABLE "posts" DROP COLUMN IF EXISTS "tenant_id";
  ALTER TABLE "_posts_v" DROP COLUMN IF EXISTS "version_tenant_id";
  ALTER TABLE "media" DROP COLUMN IF EXISTS "tenant_id";
  ALTER TABLE "categories" DROP COLUMN IF EXISTS "tenant_id";
  ALTER TABLE "analytics" DROP COLUMN IF EXISTS "tenant_id";
  ALTER TABLE "redirects" DROP COLUMN IF EXISTS "tenant_id";
  ALTER TABLE "forms" DROP COLUMN IF EXISTS "tenant_id";
  ALTER TABLE "form_submissions" DROP COLUMN IF EXISTS "tenant_id";
  ALTER TABLE "search" DROP COLUMN IF EXISTS "tenant_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "tenants_id";
  `)
}

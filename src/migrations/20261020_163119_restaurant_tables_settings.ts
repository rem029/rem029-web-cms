import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_settings_restaurant_opening_hours_weekday" AS ENUM('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun');
  CREATE TYPE "public"."enum_settings_restaurant_opening_hours_opens" AS ENUM('00:00', '00:30', '01:00', '01:30', '02:00', '02:30', '03:00', '03:30', '04:00', '04:30', '05:00', '05:30', '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30');
  CREATE TYPE "public"."enum_settings_restaurant_opening_hours_closes" AS ENUM('00:00', '00:30', '01:00', '01:30', '02:00', '02:30', '03:00', '03:30', '04:00', '04:30', '05:00', '05:30', '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30');
  CREATE TYPE "public"."enum_settings_restaurant_day_starts_at" AS ENUM('00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00');
  CREATE TYPE "public"."enum_menus_ordering_flow" AS ENUM('waiter_kitchen_cashier', 'waiter_kitchen', 'kitchen_only');
  CREATE TYPE "public"."enum__menus_v_version_ordering_flow" AS ENUM('waiter_kitchen_cashier', 'waiter_kitchen', 'kitchen_only');
  ALTER TYPE "public"."enum_users_access_access_slug" ADD VALUE 'tables' BEFORE 'audit-logs';
  CREATE TABLE "settings_restaurant_opening_hours" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"weekday" "enum_settings_restaurant_opening_hours_weekday" NOT NULL,
  	"opens" "enum_settings_restaurant_opening_hours_opens",
  	"closes" "enum_settings_restaurant_opening_hours_closes",
  	"closed" boolean DEFAULT false
  );
  
  CREATE TABLE "tables" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"seats" numeric,
  	"sort_order" numeric DEFAULT 0,
  	"slug" varchar,
  	"slug_lock" boolean DEFAULT true,
  	"is_active" boolean DEFAULT true,
  	"created_by_id" integer,
  	"updated_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "tables_locales" (
  	"label" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "tables_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"menus_id" integer
  );
  
  ALTER TABLE "settings" ADD COLUMN "restaurant_logo_id" integer;
  ALTER TABLE "settings" ADD COLUMN "restaurant_timezone" varchar DEFAULT 'UTC';
  ALTER TABLE "settings" ADD COLUMN "restaurant_day_starts_at" "enum_settings_restaurant_day_starts_at" DEFAULT '00:00';
  ALTER TABLE "settings" ADD COLUMN "restaurant_orders_only_when_open" boolean DEFAULT false;
  ALTER TABLE "settings" ADD COLUMN "restaurant_legal_name" varchar;
  ALTER TABLE "settings" ADD COLUMN "restaurant_tax_number" varchar;
  ALTER TABLE "settings_locales" ADD COLUMN "restaurant_name" varchar;
  ALTER TABLE "menus" ADD COLUMN "ordering_enabled" boolean DEFAULT false;
  ALTER TABLE "menus" ADD COLUMN "ordering_flow" "enum_menus_ordering_flow" DEFAULT 'waiter_kitchen_cashier';
  ALTER TABLE "menus" ADD COLUMN "ordering_show_prices" boolean DEFAULT true;
  ALTER TABLE "_menus_v" ADD COLUMN "version_ordering_enabled" boolean DEFAULT false;
  ALTER TABLE "_menus_v" ADD COLUMN "version_ordering_flow" "enum__menus_v_version_ordering_flow" DEFAULT 'waiter_kitchen_cashier';
  ALTER TABLE "_menus_v" ADD COLUMN "version_ordering_show_prices" boolean DEFAULT true;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "tables_id" integer;
  ALTER TABLE "settings_restaurant_opening_hours" ADD CONSTRAINT "settings_restaurant_opening_hours_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tables" ADD CONSTRAINT "tables_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tables" ADD CONSTRAINT "tables_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tables" ADD CONSTRAINT "tables_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tables_locales" ADD CONSTRAINT "tables_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tables"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tables_rels" ADD CONSTRAINT "tables_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."tables"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tables_rels" ADD CONSTRAINT "tables_rels_menus_fk" FOREIGN KEY ("menus_id") REFERENCES "public"."menus"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "settings_restaurant_opening_hours_order_idx" ON "settings_restaurant_opening_hours" USING btree ("_order");
  CREATE INDEX "settings_restaurant_opening_hours_parent_id_idx" ON "settings_restaurant_opening_hours" USING btree ("_parent_id");
  CREATE INDEX "tables_tenant_idx" ON "tables" USING btree ("tenant_id");
  CREATE INDEX "tables_slug_idx" ON "tables" USING btree ("slug");
  CREATE INDEX "tables_created_by_idx" ON "tables" USING btree ("created_by_id");
  CREATE INDEX "tables_updated_by_idx" ON "tables" USING btree ("updated_by_id");
  CREATE INDEX "tables_updated_at_idx" ON "tables" USING btree ("updated_at");
  CREATE INDEX "tables_created_at_idx" ON "tables" USING btree ("created_at");
  CREATE UNIQUE INDEX "tenant_slug_7_idx" ON "tables" USING btree ("tenant_id","slug");
  CREATE UNIQUE INDEX "tables_locales_locale_parent_id_unique" ON "tables_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "tables_rels_order_idx" ON "tables_rels" USING btree ("order");
  CREATE INDEX "tables_rels_parent_idx" ON "tables_rels" USING btree ("parent_id");
  CREATE INDEX "tables_rels_path_idx" ON "tables_rels" USING btree ("path");
  CREATE INDEX "tables_rels_menus_id_idx" ON "tables_rels" USING btree ("menus_id");
  ALTER TABLE "settings" ADD CONSTRAINT "settings_restaurant_logo_id_media_id_fk" FOREIGN KEY ("restaurant_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tables_fk" FOREIGN KEY ("tables_id") REFERENCES "public"."tables"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "settings_restaurant_restaurant_logo_idx" ON "settings" USING btree ("restaurant_logo_id");
  CREATE INDEX "payload_locked_documents_rels_tables_id_idx" ON "payload_locked_documents_rels" USING btree ("tables_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "settings_restaurant_opening_hours" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "tables" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "tables_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "tables_rels" DISABLE ROW LEVEL SECURITY;
  -- drop the foreign key first: DROP TABLE … CASCADE below already removes it, and the
  -- DROP CONSTRAINT Payload generates after it then fails (known generator bug, see CLAUDE.md)
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_tables_fk";
  DROP TABLE "settings_restaurant_opening_hours" CASCADE;
  DROP TABLE "tables" CASCADE;
  DROP TABLE "tables_locales" CASCADE;
  DROP TABLE "tables_rels" CASCADE;
  ALTER TABLE "settings" DROP CONSTRAINT "settings_restaurant_logo_id_media_id_fk";
  -- profile rows for tables would fail the cast back to the enum without its value: remove them
  DELETE FROM "users_access_access" WHERE "slug" = 'tables';
  ALTER TABLE "users_access_access" ALTER COLUMN "slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_users_access_access_slug";
  CREATE TYPE "public"."enum_users_access_access_slug" AS ENUM('pages', 'posts', 'media', 'categories', 'users', 'users-access', 'analytics', 'tenants', 'header', 'footer', 'theme', 'settings', 'menu-categories', 'menu-allergens', 'menu-tags', 'menu-items', 'menus', 'audit-logs', 'field-showcase', 'redirects', 'forms', 'form-submissions', 'search', 'field-showcase-global');
  ALTER TABLE "users_access_access" ALTER COLUMN "slug" SET DATA TYPE "public"."enum_users_access_access_slug" USING "slug"::"public"."enum_users_access_access_slug";
  DROP INDEX "settings_restaurant_restaurant_logo_idx";
  DROP INDEX "payload_locked_documents_rels_tables_id_idx";
  ALTER TABLE "settings" DROP COLUMN "restaurant_logo_id";
  ALTER TABLE "settings" DROP COLUMN "restaurant_timezone";
  ALTER TABLE "settings" DROP COLUMN "restaurant_day_starts_at";
  ALTER TABLE "settings" DROP COLUMN "restaurant_orders_only_when_open";
  ALTER TABLE "settings" DROP COLUMN "restaurant_legal_name";
  ALTER TABLE "settings" DROP COLUMN "restaurant_tax_number";
  ALTER TABLE "settings_locales" DROP COLUMN "restaurant_name";
  ALTER TABLE "menus" DROP COLUMN "ordering_enabled";
  ALTER TABLE "menus" DROP COLUMN "ordering_flow";
  ALTER TABLE "menus" DROP COLUMN "ordering_show_prices";
  ALTER TABLE "_menus_v" DROP COLUMN "version_ordering_enabled";
  ALTER TABLE "_menus_v" DROP COLUMN "version_ordering_flow";
  ALTER TABLE "_menus_v" DROP COLUMN "version_ordering_show_prices";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "tables_id";
  DROP TYPE "public"."enum_settings_restaurant_opening_hours_weekday";
  DROP TYPE "public"."enum_settings_restaurant_opening_hours_opens";
  DROP TYPE "public"."enum_settings_restaurant_opening_hours_closes";
  DROP TYPE "public"."enum_settings_restaurant_day_starts_at";
  DROP TYPE "public"."enum_menus_ordering_flow";
  DROP TYPE "public"."enum__menus_v_version_ordering_flow";`)
}

import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_settings_currency" AS ENUM('USD', 'EUR', 'GBP', 'QAR', 'AED', 'SAR', 'KWD', 'BHD', 'OMR', 'JOD', 'EGP', 'INR', 'PHP');
  CREATE TYPE "public"."enum_menu_items_availability" AS ENUM('breakfast', 'lunch', 'dinner', 'all_day');
  CREATE TYPE "public"."enum_menu_items_modifier_groups_input_type" AS ENUM('checkbox', 'radio');
  ALTER TYPE "public"."enum_users_access_access_slug" ADD VALUE 'menu-categories' BEFORE 'redirects';
  ALTER TYPE "public"."enum_users_access_access_slug" ADD VALUE 'menu-allergens' BEFORE 'redirects';
  ALTER TYPE "public"."enum_users_access_access_slug" ADD VALUE 'menu-tags' BEFORE 'redirects';
  ALTER TYPE "public"."enum_users_access_access_slug" ADD VALUE 'menu-items' BEFORE 'redirects';
  CREATE TABLE "menu_categories" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"slug" varchar,
  	"slug_lock" boolean DEFAULT true,
  	"sort_order" numeric DEFAULT 0,
  	"created_by_id" integer,
  	"updated_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "menu_categories_locales" (
  	"title" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "menu_allergens" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"image_id" integer,
  	"created_by_id" integer,
  	"updated_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "menu_allergens_locales" (
  	"title" varchar NOT NULL,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "menu_tags" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"created_by_id" integer,
  	"updated_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "menu_tags_locales" (
  	"title" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "menu_items_availability" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_menu_items_availability",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "menu_items_modifier_groups_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "menu_items_modifier_groups_options_locales" (
  	"label" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "menu_items_modifier_groups" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"input_type" "enum_menu_items_modifier_groups_input_type" DEFAULT 'checkbox' NOT NULL,
  	"required" boolean DEFAULT false
  );
  
  CREATE TABLE "menu_items_modifier_groups_locales" (
  	"name" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "menu_items" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"price" numeric NOT NULL,
  	"category_id" integer,
  	"image_id" integer,
  	"slug" varchar,
  	"slug_lock" boolean DEFAULT true,
  	"in_stock" boolean DEFAULT true,
  	"is_active" boolean DEFAULT true,
  	"created_by_id" integer,
  	"updated_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "menu_items_locales" (
  	"title" varchar NOT NULL,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "menu_items_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"menu_allergens_id" integer,
  	"menu_tags_id" integer
  );
  
  ALTER TABLE "settings" ADD COLUMN "currency" "enum_settings_currency" DEFAULT 'USD';
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "menu_categories_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "menu_allergens_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "menu_tags_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "menu_items_id" integer;
  ALTER TABLE "menu_categories" ADD CONSTRAINT "menu_categories_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "menu_categories" ADD CONSTRAINT "menu_categories_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "menu_categories" ADD CONSTRAINT "menu_categories_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "menu_categories_locales" ADD CONSTRAINT "menu_categories_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."menu_categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "menu_allergens" ADD CONSTRAINT "menu_allergens_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "menu_allergens" ADD CONSTRAINT "menu_allergens_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "menu_allergens" ADD CONSTRAINT "menu_allergens_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "menu_allergens" ADD CONSTRAINT "menu_allergens_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "menu_allergens_locales" ADD CONSTRAINT "menu_allergens_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."menu_allergens"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "menu_tags" ADD CONSTRAINT "menu_tags_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "menu_tags" ADD CONSTRAINT "menu_tags_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "menu_tags" ADD CONSTRAINT "menu_tags_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "menu_tags_locales" ADD CONSTRAINT "menu_tags_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."menu_tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "menu_items_availability" ADD CONSTRAINT "menu_items_availability_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."menu_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "menu_items_modifier_groups_options" ADD CONSTRAINT "menu_items_modifier_groups_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."menu_items_modifier_groups"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "menu_items_modifier_groups_options_locales" ADD CONSTRAINT "menu_items_modifier_groups_options_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."menu_items_modifier_groups_options"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "menu_items_modifier_groups" ADD CONSTRAINT "menu_items_modifier_groups_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."menu_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "menu_items_modifier_groups_locales" ADD CONSTRAINT "menu_items_modifier_groups_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."menu_items_modifier_groups"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_category_id_menu_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."menu_categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "menu_items_locales" ADD CONSTRAINT "menu_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."menu_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "menu_items_rels" ADD CONSTRAINT "menu_items_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."menu_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "menu_items_rels" ADD CONSTRAINT "menu_items_rels_menu_allergens_fk" FOREIGN KEY ("menu_allergens_id") REFERENCES "public"."menu_allergens"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "menu_items_rels" ADD CONSTRAINT "menu_items_rels_menu_tags_fk" FOREIGN KEY ("menu_tags_id") REFERENCES "public"."menu_tags"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "menu_categories_tenant_idx" ON "menu_categories" USING btree ("tenant_id");
  CREATE INDEX "menu_categories_slug_idx" ON "menu_categories" USING btree ("slug");
  CREATE INDEX "menu_categories_created_by_idx" ON "menu_categories" USING btree ("created_by_id");
  CREATE INDEX "menu_categories_updated_by_idx" ON "menu_categories" USING btree ("updated_by_id");
  CREATE INDEX "menu_categories_updated_at_idx" ON "menu_categories" USING btree ("updated_at");
  CREATE INDEX "menu_categories_created_at_idx" ON "menu_categories" USING btree ("created_at");
  CREATE UNIQUE INDEX "tenant_slug_4_idx" ON "menu_categories" USING btree ("tenant_id","slug");
  CREATE UNIQUE INDEX "menu_categories_locales_locale_parent_id_unique" ON "menu_categories_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "menu_allergens_tenant_idx" ON "menu_allergens" USING btree ("tenant_id");
  CREATE INDEX "menu_allergens_image_idx" ON "menu_allergens" USING btree ("image_id");
  CREATE INDEX "menu_allergens_created_by_idx" ON "menu_allergens" USING btree ("created_by_id");
  CREATE INDEX "menu_allergens_updated_by_idx" ON "menu_allergens" USING btree ("updated_by_id");
  CREATE INDEX "menu_allergens_updated_at_idx" ON "menu_allergens" USING btree ("updated_at");
  CREATE INDEX "menu_allergens_created_at_idx" ON "menu_allergens" USING btree ("created_at");
  CREATE UNIQUE INDEX "menu_allergens_locales_locale_parent_id_unique" ON "menu_allergens_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "menu_tags_tenant_idx" ON "menu_tags" USING btree ("tenant_id");
  CREATE INDEX "menu_tags_created_by_idx" ON "menu_tags" USING btree ("created_by_id");
  CREATE INDEX "menu_tags_updated_by_idx" ON "menu_tags" USING btree ("updated_by_id");
  CREATE INDEX "menu_tags_updated_at_idx" ON "menu_tags" USING btree ("updated_at");
  CREATE INDEX "menu_tags_created_at_idx" ON "menu_tags" USING btree ("created_at");
  CREATE UNIQUE INDEX "menu_tags_locales_locale_parent_id_unique" ON "menu_tags_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "menu_items_availability_order_idx" ON "menu_items_availability" USING btree ("order");
  CREATE INDEX "menu_items_availability_parent_idx" ON "menu_items_availability" USING btree ("parent_id");
  CREATE INDEX "menu_items_modifier_groups_options_order_idx" ON "menu_items_modifier_groups_options" USING btree ("_order");
  CREATE INDEX "menu_items_modifier_groups_options_parent_id_idx" ON "menu_items_modifier_groups_options" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "menu_items_modifier_groups_options_locales_locale_parent_id_unique" ON "menu_items_modifier_groups_options_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "menu_items_modifier_groups_order_idx" ON "menu_items_modifier_groups" USING btree ("_order");
  CREATE INDEX "menu_items_modifier_groups_parent_id_idx" ON "menu_items_modifier_groups" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "menu_items_modifier_groups_locales_locale_parent_id_unique" ON "menu_items_modifier_groups_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "menu_items_tenant_idx" ON "menu_items" USING btree ("tenant_id");
  CREATE INDEX "menu_items_category_idx" ON "menu_items" USING btree ("category_id");
  CREATE INDEX "menu_items_image_idx" ON "menu_items" USING btree ("image_id");
  CREATE INDEX "menu_items_slug_idx" ON "menu_items" USING btree ("slug");
  CREATE INDEX "menu_items_created_by_idx" ON "menu_items" USING btree ("created_by_id");
  CREATE INDEX "menu_items_updated_by_idx" ON "menu_items" USING btree ("updated_by_id");
  CREATE INDEX "menu_items_updated_at_idx" ON "menu_items" USING btree ("updated_at");
  CREATE INDEX "menu_items_created_at_idx" ON "menu_items" USING btree ("created_at");
  CREATE UNIQUE INDEX "tenant_slug_5_idx" ON "menu_items" USING btree ("tenant_id","slug");
  CREATE UNIQUE INDEX "menu_items_locales_locale_parent_id_unique" ON "menu_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "menu_items_rels_order_idx" ON "menu_items_rels" USING btree ("order");
  CREATE INDEX "menu_items_rels_parent_idx" ON "menu_items_rels" USING btree ("parent_id");
  CREATE INDEX "menu_items_rels_path_idx" ON "menu_items_rels" USING btree ("path");
  CREATE INDEX "menu_items_rels_menu_allergens_id_idx" ON "menu_items_rels" USING btree ("menu_allergens_id");
  CREATE INDEX "menu_items_rels_menu_tags_id_idx" ON "menu_items_rels" USING btree ("menu_tags_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_menu_categories_fk" FOREIGN KEY ("menu_categories_id") REFERENCES "public"."menu_categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_menu_allergens_fk" FOREIGN KEY ("menu_allergens_id") REFERENCES "public"."menu_allergens"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_menu_tags_fk" FOREIGN KEY ("menu_tags_id") REFERENCES "public"."menu_tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_menu_items_fk" FOREIGN KEY ("menu_items_id") REFERENCES "public"."menu_items"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_menu_categories_id_idx" ON "payload_locked_documents_rels" USING btree ("menu_categories_id");
  CREATE INDEX "payload_locked_documents_rels_menu_allergens_id_idx" ON "payload_locked_documents_rels" USING btree ("menu_allergens_id");
  CREATE INDEX "payload_locked_documents_rels_menu_tags_id_idx" ON "payload_locked_documents_rels" USING btree ("menu_tags_id");
  CREATE INDEX "payload_locked_documents_rels_menu_items_id_idx" ON "payload_locked_documents_rels" USING btree ("menu_items_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "menu_categories" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "menu_categories_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "menu_allergens" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "menu_allergens_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "menu_tags" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "menu_tags_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "menu_items_availability" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "menu_items_modifier_groups_options" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "menu_items_modifier_groups_options_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "menu_items_modifier_groups" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "menu_items_modifier_groups_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "menu_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "menu_items_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "menu_items_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "menu_categories" CASCADE;
  DROP TABLE "menu_categories_locales" CASCADE;
  DROP TABLE "menu_allergens" CASCADE;
  DROP TABLE "menu_allergens_locales" CASCADE;
  DROP TABLE "menu_tags" CASCADE;
  DROP TABLE "menu_tags_locales" CASCADE;
  DROP TABLE "menu_items_availability" CASCADE;
  DROP TABLE "menu_items_modifier_groups_options" CASCADE;
  DROP TABLE "menu_items_modifier_groups_options_locales" CASCADE;
  DROP TABLE "menu_items_modifier_groups" CASCADE;
  DROP TABLE "menu_items_modifier_groups_locales" CASCADE;
  DROP TABLE "menu_items" CASCADE;
  DROP TABLE "menu_items_locales" CASCADE;
  DROP TABLE "menu_items_rels" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_menu_categories_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_menu_allergens_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_menu_tags_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_menu_items_fk";
  
  ALTER TABLE "users_access_access" ALTER COLUMN "slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_users_access_access_slug";
  CREATE TYPE "public"."enum_users_access_access_slug" AS ENUM('pages', 'posts', 'media', 'categories', 'users', 'users-access', 'analytics', 'tenants', 'header', 'footer', 'theme', 'settings', 'redirects', 'forms', 'form-submissions', 'search');
  ALTER TABLE "users_access_access" ALTER COLUMN "slug" SET DATA TYPE "public"."enum_users_access_access_slug" USING "slug"::"public"."enum_users_access_access_slug";
  DROP INDEX "payload_locked_documents_rels_menu_categories_id_idx";
  DROP INDEX "payload_locked_documents_rels_menu_allergens_id_idx";
  DROP INDEX "payload_locked_documents_rels_menu_tags_id_idx";
  DROP INDEX "payload_locked_documents_rels_menu_items_id_idx";
  ALTER TABLE "settings" DROP COLUMN "currency";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "menu_categories_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "menu_allergens_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "menu_tags_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "menu_items_id";
  DROP TYPE "public"."enum_settings_currency";
  DROP TYPE "public"."enum_menu_items_availability";
  DROP TYPE "public"."enum_menu_items_modifier_groups_input_type";`)
}

import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_menus_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__menus_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__menus_v_published_locale" AS ENUM('en', 'ar');
  ALTER TYPE "public"."enum_users_access_access_slug" ADD VALUE 'menus' BEFORE 'redirects';
  CREATE TABLE "menus_carousel" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer
  );
  
  CREATE TABLE "menus" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"header_logo_id" integer,
  	"header_show_language_switch" boolean DEFAULT true,
  	"filters_show_search" boolean DEFAULT true,
  	"filters_show_allergens" boolean DEFAULT false,
  	"filters_show_availability" boolean DEFAULT false,
  	"colors_primary" varchar,
  	"colors_background" varchar,
  	"colors_card" varchar,
  	"colors_text" varchar,
  	"slug" varchar,
  	"slug_lock" boolean DEFAULT true,
  	"is_hidden" boolean DEFAULT false,
  	"created_by_id" integer,
  	"updated_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_menus_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "menus_locales" (
  	"title" varchar,
  	"header_title" varchar,
  	"intro_heading" varchar,
  	"intro_subheading" varchar,
  	"meta_title" varchar,
  	"meta_image_id" integer,
  	"meta_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "menus_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"menu_items_id" integer,
  	"users_id" integer
  );
  
  CREATE TABLE "_menus_v_version_carousel" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_menus_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_tenant_id" integer,
  	"version_header_logo_id" integer,
  	"version_header_show_language_switch" boolean DEFAULT true,
  	"version_filters_show_search" boolean DEFAULT true,
  	"version_filters_show_allergens" boolean DEFAULT false,
  	"version_filters_show_availability" boolean DEFAULT false,
  	"version_colors_primary" varchar,
  	"version_colors_background" varchar,
  	"version_colors_card" varchar,
  	"version_colors_text" varchar,
  	"version_slug" varchar,
  	"version_slug_lock" boolean DEFAULT true,
  	"version_is_hidden" boolean DEFAULT false,
  	"version_created_by_id" integer,
  	"version_updated_by_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__menus_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__menus_v_published_locale",
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_menus_v_locales" (
  	"version_title" varchar,
  	"version_header_title" varchar,
  	"version_intro_heading" varchar,
  	"version_intro_subheading" varchar,
  	"version_meta_title" varchar,
  	"version_meta_image_id" integer,
  	"version_meta_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_menus_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"menu_items_id" integer,
  	"users_id" integer
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "menus_id" integer;
  ALTER TABLE "menus_carousel" ADD CONSTRAINT "menus_carousel_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "menus_carousel" ADD CONSTRAINT "menus_carousel_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."menus"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "menus" ADD CONSTRAINT "menus_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "menus" ADD CONSTRAINT "menus_header_logo_id_media_id_fk" FOREIGN KEY ("header_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "menus" ADD CONSTRAINT "menus_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "menus" ADD CONSTRAINT "menus_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "menus_locales" ADD CONSTRAINT "menus_locales_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "menus_locales" ADD CONSTRAINT "menus_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."menus"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "menus_rels" ADD CONSTRAINT "menus_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."menus"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "menus_rels" ADD CONSTRAINT "menus_rels_menu_items_fk" FOREIGN KEY ("menu_items_id") REFERENCES "public"."menu_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "menus_rels" ADD CONSTRAINT "menus_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_menus_v_version_carousel" ADD CONSTRAINT "_menus_v_version_carousel_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_menus_v_version_carousel" ADD CONSTRAINT "_menus_v_version_carousel_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_menus_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_menus_v" ADD CONSTRAINT "_menus_v_parent_id_menus_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."menus"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_menus_v" ADD CONSTRAINT "_menus_v_version_tenant_id_tenants_id_fk" FOREIGN KEY ("version_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_menus_v" ADD CONSTRAINT "_menus_v_version_header_logo_id_media_id_fk" FOREIGN KEY ("version_header_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_menus_v" ADD CONSTRAINT "_menus_v_version_created_by_id_users_id_fk" FOREIGN KEY ("version_created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_menus_v" ADD CONSTRAINT "_menus_v_version_updated_by_id_users_id_fk" FOREIGN KEY ("version_updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_menus_v_locales" ADD CONSTRAINT "_menus_v_locales_version_meta_image_id_media_id_fk" FOREIGN KEY ("version_meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_menus_v_locales" ADD CONSTRAINT "_menus_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_menus_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_menus_v_rels" ADD CONSTRAINT "_menus_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_menus_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_menus_v_rels" ADD CONSTRAINT "_menus_v_rels_menu_items_fk" FOREIGN KEY ("menu_items_id") REFERENCES "public"."menu_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_menus_v_rels" ADD CONSTRAINT "_menus_v_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "menus_carousel_order_idx" ON "menus_carousel" USING btree ("_order");
  CREATE INDEX "menus_carousel_parent_id_idx" ON "menus_carousel" USING btree ("_parent_id");
  CREATE INDEX "menus_carousel_image_idx" ON "menus_carousel" USING btree ("image_id");
  CREATE INDEX "menus_tenant_idx" ON "menus" USING btree ("tenant_id");
  CREATE INDEX "menus_header_header_logo_idx" ON "menus" USING btree ("header_logo_id");
  CREATE INDEX "menus_slug_idx" ON "menus" USING btree ("slug");
  CREATE INDEX "menus_created_by_idx" ON "menus" USING btree ("created_by_id");
  CREATE INDEX "menus_updated_by_idx" ON "menus" USING btree ("updated_by_id");
  CREATE INDEX "menus_updated_at_idx" ON "menus" USING btree ("updated_at");
  CREATE INDEX "menus_created_at_idx" ON "menus" USING btree ("created_at");
  CREATE INDEX "menus__status_idx" ON "menus" USING btree ("_status");
  CREATE UNIQUE INDEX "tenant_slug_6_idx" ON "menus" USING btree ("tenant_id","slug");
  CREATE INDEX "menus_meta_meta_image_idx" ON "menus_locales" USING btree ("meta_image_id","_locale");
  CREATE UNIQUE INDEX "menus_locales_locale_parent_id_unique" ON "menus_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "menus_rels_order_idx" ON "menus_rels" USING btree ("order");
  CREATE INDEX "menus_rels_parent_idx" ON "menus_rels" USING btree ("parent_id");
  CREATE INDEX "menus_rels_path_idx" ON "menus_rels" USING btree ("path");
  CREATE INDEX "menus_rels_menu_items_id_idx" ON "menus_rels" USING btree ("menu_items_id");
  CREATE INDEX "menus_rels_users_id_idx" ON "menus_rels" USING btree ("users_id");
  CREATE INDEX "_menus_v_version_carousel_order_idx" ON "_menus_v_version_carousel" USING btree ("_order");
  CREATE INDEX "_menus_v_version_carousel_parent_id_idx" ON "_menus_v_version_carousel" USING btree ("_parent_id");
  CREATE INDEX "_menus_v_version_carousel_image_idx" ON "_menus_v_version_carousel" USING btree ("image_id");
  CREATE INDEX "_menus_v_parent_idx" ON "_menus_v" USING btree ("parent_id");
  CREATE INDEX "_menus_v_version_version_tenant_idx" ON "_menus_v" USING btree ("version_tenant_id");
  CREATE INDEX "_menus_v_version_header_version_header_logo_idx" ON "_menus_v" USING btree ("version_header_logo_id");
  CREATE INDEX "_menus_v_version_version_slug_idx" ON "_menus_v" USING btree ("version_slug");
  CREATE INDEX "_menus_v_version_version_created_by_idx" ON "_menus_v" USING btree ("version_created_by_id");
  CREATE INDEX "_menus_v_version_version_updated_by_idx" ON "_menus_v" USING btree ("version_updated_by_id");
  CREATE INDEX "_menus_v_version_version_updated_at_idx" ON "_menus_v" USING btree ("version_updated_at");
  CREATE INDEX "_menus_v_version_version_created_at_idx" ON "_menus_v" USING btree ("version_created_at");
  CREATE INDEX "_menus_v_version_version__status_idx" ON "_menus_v" USING btree ("version__status");
  CREATE INDEX "_menus_v_created_at_idx" ON "_menus_v" USING btree ("created_at");
  CREATE INDEX "_menus_v_updated_at_idx" ON "_menus_v" USING btree ("updated_at");
  CREATE INDEX "_menus_v_snapshot_idx" ON "_menus_v" USING btree ("snapshot");
  CREATE INDEX "_menus_v_published_locale_idx" ON "_menus_v" USING btree ("published_locale");
  CREATE INDEX "_menus_v_latest_idx" ON "_menus_v" USING btree ("latest");
  CREATE INDEX "_menus_v_autosave_idx" ON "_menus_v" USING btree ("autosave");
  CREATE INDEX "version_tenant_version_slug_2_idx" ON "_menus_v" USING btree ("version_tenant_id","version_slug");
  CREATE INDEX "_menus_v_version_meta_version_meta_image_idx" ON "_menus_v_locales" USING btree ("version_meta_image_id","_locale");
  CREATE UNIQUE INDEX "_menus_v_locales_locale_parent_id_unique" ON "_menus_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_menus_v_rels_order_idx" ON "_menus_v_rels" USING btree ("order");
  CREATE INDEX "_menus_v_rels_parent_idx" ON "_menus_v_rels" USING btree ("parent_id");
  CREATE INDEX "_menus_v_rels_path_idx" ON "_menus_v_rels" USING btree ("path");
  CREATE INDEX "_menus_v_rels_menu_items_id_idx" ON "_menus_v_rels" USING btree ("menu_items_id");
  CREATE INDEX "_menus_v_rels_users_id_idx" ON "_menus_v_rels" USING btree ("users_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_menus_fk" FOREIGN KEY ("menus_id") REFERENCES "public"."menus"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_menus_id_idx" ON "payload_locked_documents_rels" USING btree ("menus_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "menus_carousel" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "menus" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "menus_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "menus_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_menus_v_version_carousel" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_menus_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_menus_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_menus_v_rels" DISABLE ROW LEVEL SECURITY;
  -- drop the foreign key first: DROP TABLE … CASCADE below already removes it, and the
  -- DROP CONSTRAINT Payload generates after it then fails (known generator bug, see CLAUDE.md)
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_menus_fk";
  DROP TABLE "menus_carousel" CASCADE;
  DROP TABLE "menus" CASCADE;
  DROP TABLE "menus_locales" CASCADE;
  DROP TABLE "menus_rels" CASCADE;
  DROP TABLE "_menus_v_version_carousel" CASCADE;
  DROP TABLE "_menus_v" CASCADE;
  DROP TABLE "_menus_v_locales" CASCADE;
  DROP TABLE "_menus_v_rels" CASCADE;
  ALTER TABLE "users_access_access" ALTER COLUMN "slug" SET DATA TYPE text;
  -- profile rows for menus: the old enum has no value for them
  DELETE FROM "users_access_access" WHERE "slug" = 'menus';
  DROP TYPE "public"."enum_users_access_access_slug";
  CREATE TYPE "public"."enum_users_access_access_slug" AS ENUM('pages', 'posts', 'media', 'categories', 'users', 'users-access', 'analytics', 'tenants', 'header', 'footer', 'theme', 'settings', 'menu-categories', 'menu-allergens', 'menu-tags', 'menu-items', 'redirects', 'forms', 'form-submissions', 'search');
  ALTER TABLE "users_access_access" ALTER COLUMN "slug" SET DATA TYPE "public"."enum_users_access_access_slug" USING "slug"::"public"."enum_users_access_access_slug";
  DROP INDEX "payload_locked_documents_rels_menus_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "menus_id";
  DROP TYPE "public"."enum_menus_status";
  DROP TYPE "public"."enum__menus_v_version_status";
  DROP TYPE "public"."enum__menus_v_published_locale";`)
}

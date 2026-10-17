import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_field_showcase_select_many" AS ENUM('red', 'green', 'blue');
  CREATE TYPE "public"."enum_field_showcase_blocks_showcase_callout_tone" AS ENUM('info', 'success', 'warning', 'danger');
  CREATE TYPE "public"."enum_field_showcase_select_single" AS ENUM('small', 'medium', 'large');
  CREATE TYPE "public"."enum_field_showcase_select_long" AS ENUM('apple', 'banana', 'cherry', 'date', 'elderberry', 'fig', 'grape', 'honeydew', 'kiwi', 'lemon', 'mango', 'nectarine');
  CREATE TYPE "public"."enum_field_showcase_radio" AS ENUM('morning', 'afternoon', 'evening');
  CREATE TYPE "public"."enum_field_showcase_radio_horizontal" AS ENUM('yes', 'no', 'maybe');
  CREATE TYPE "public"."enum_field_showcase_meta_level" AS ENUM('low', 'high');
  CREATE TYPE "public"."enum_field_showcase_stage" AS ENUM('idea', 'review', 'done');
  CREATE TYPE "public"."enum_field_showcase_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__field_showcase_v_version_select_many" AS ENUM('red', 'green', 'blue');
  CREATE TYPE "public"."enum__field_showcase_v_blocks_showcase_callout_tone" AS ENUM('info', 'success', 'warning', 'danger');
  CREATE TYPE "public"."enum__field_showcase_v_version_select_single" AS ENUM('small', 'medium', 'large');
  CREATE TYPE "public"."enum__field_showcase_v_version_select_long" AS ENUM('apple', 'banana', 'cherry', 'date', 'elderberry', 'fig', 'grape', 'honeydew', 'kiwi', 'lemon', 'mango', 'nectarine');
  CREATE TYPE "public"."enum__field_showcase_v_version_radio" AS ENUM('morning', 'afternoon', 'evening');
  CREATE TYPE "public"."enum__field_showcase_v_version_radio_horizontal" AS ENUM('yes', 'no', 'maybe');
  CREATE TYPE "public"."enum__field_showcase_v_version_meta_level" AS ENUM('low', 'high');
  CREATE TYPE "public"."enum__field_showcase_v_version_stage" AS ENUM('idea', 'review', 'done');
  CREATE TYPE "public"."enum__field_showcase_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__field_showcase_v_published_locale" AS ENUM('en', 'ar');
  ALTER TYPE "public"."enum_users_access_access_slug" ADD VALUE 'field-showcase' BEFORE 'redirects';
  CREATE TABLE "field_showcase_select_many" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_field_showcase_select_many",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "field_showcase_blocks_showcase_callout" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"tone" "enum_field_showcase_blocks_showcase_callout_tone" DEFAULT 'info',
  	"text" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "field_showcase_blocks_showcase_quote" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"quote" varchar,
  	"author" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "field_showcase_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"done" boolean
  );
  
  CREATE TABLE "field_showcase_meta_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"url" varchar
  );
  
  CREATE TABLE "field_showcase" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"title" varchar,
  	"text" varchar,
  	"text_read_only" varchar DEFAULT 'You can read this but not change it',
  	"textarea" varchar,
  	"email" varchar,
  	"number" numeric,
  	"code" varchar,
  	"json" jsonb,
  	"checkbox" boolean,
  	"show_more" boolean,
  	"conditional" varchar,
  	"select_single" "enum_field_showcase_select_single",
  	"select_long" "enum_field_showcase_select_long",
  	"radio" "enum_field_showcase_radio",
  	"radio_horizontal" "enum_field_showcase_radio_horizontal",
  	"date_time" timestamp(3) with time zone,
  	"date_day" timestamp(3) with time zone,
  	"date_month" timestamp(3) with time zone,
  	"date_time_only" timestamp(3) with time zone,
  	"parent_id" integer,
  	"image_id" integer,
  	"rich_text" jsonb,
  	"meta_note" varchar,
  	"meta_level" "enum_field_showcase_meta_level",
  	"first_name" varchar,
  	"last_name" varchar,
  	"open_note" varchar,
  	"closed_note" varchar,
  	"stage" "enum_field_showcase_stage" DEFAULT 'idea',
  	"featured" boolean,
  	"reviewed_at" timestamp(3) with time zone,
  	"created_by_id" integer,
  	"updated_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_field_showcase_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "field_showcase_locales" (
  	"text_localized" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "field_showcase_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "field_showcase_numbers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"number" numeric,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL
  );
  
  CREATE TABLE "field_showcase_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"pages_id" integer,
  	"posts_id" integer,
  	"media_id" integer
  );
  
  CREATE TABLE "_field_showcase_v_version_select_many" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum__field_showcase_v_version_select_many",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "_field_showcase_v_blocks_showcase_callout" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"tone" "enum__field_showcase_v_blocks_showcase_callout_tone" DEFAULT 'info',
  	"text" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_field_showcase_v_blocks_showcase_quote" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"quote" varchar,
  	"author" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_field_showcase_v_version_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"done" boolean,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_field_showcase_v_version_meta_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"url" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_field_showcase_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_tenant_id" integer,
  	"version_title" varchar,
  	"version_text" varchar,
  	"version_text_read_only" varchar DEFAULT 'You can read this but not change it',
  	"version_textarea" varchar,
  	"version_email" varchar,
  	"version_number" numeric,
  	"version_code" varchar,
  	"version_json" jsonb,
  	"version_checkbox" boolean,
  	"version_show_more" boolean,
  	"version_conditional" varchar,
  	"version_select_single" "enum__field_showcase_v_version_select_single",
  	"version_select_long" "enum__field_showcase_v_version_select_long",
  	"version_radio" "enum__field_showcase_v_version_radio",
  	"version_radio_horizontal" "enum__field_showcase_v_version_radio_horizontal",
  	"version_date_time" timestamp(3) with time zone,
  	"version_date_day" timestamp(3) with time zone,
  	"version_date_month" timestamp(3) with time zone,
  	"version_date_time_only" timestamp(3) with time zone,
  	"version_parent_id" integer,
  	"version_image_id" integer,
  	"version_rich_text" jsonb,
  	"version_meta_note" varchar,
  	"version_meta_level" "enum__field_showcase_v_version_meta_level",
  	"version_first_name" varchar,
  	"version_last_name" varchar,
  	"version_open_note" varchar,
  	"version_closed_note" varchar,
  	"version_stage" "enum__field_showcase_v_version_stage" DEFAULT 'idea',
  	"version_featured" boolean,
  	"version_reviewed_at" timestamp(3) with time zone,
  	"version_created_by_id" integer,
  	"version_updated_by_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__field_showcase_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__field_showcase_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_field_showcase_v_locales" (
  	"version_text_localized" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_field_showcase_v_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "_field_showcase_v_numbers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"number" numeric,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL
  );
  
  CREATE TABLE "_field_showcase_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"pages_id" integer,
  	"posts_id" integer,
  	"media_id" integer
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "field_showcase_id" integer;
  ALTER TABLE "field_showcase_select_many" ADD CONSTRAINT "field_showcase_select_many_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."field_showcase"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "field_showcase_blocks_showcase_callout" ADD CONSTRAINT "field_showcase_blocks_showcase_callout_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."field_showcase"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "field_showcase_blocks_showcase_quote" ADD CONSTRAINT "field_showcase_blocks_showcase_quote_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."field_showcase"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "field_showcase_items" ADD CONSTRAINT "field_showcase_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."field_showcase"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "field_showcase_meta_links" ADD CONSTRAINT "field_showcase_meta_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."field_showcase"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "field_showcase" ADD CONSTRAINT "field_showcase_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "field_showcase" ADD CONSTRAINT "field_showcase_parent_id_field_showcase_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."field_showcase"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "field_showcase" ADD CONSTRAINT "field_showcase_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "field_showcase" ADD CONSTRAINT "field_showcase_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "field_showcase" ADD CONSTRAINT "field_showcase_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "field_showcase_locales" ADD CONSTRAINT "field_showcase_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."field_showcase"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "field_showcase_texts" ADD CONSTRAINT "field_showcase_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."field_showcase"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "field_showcase_numbers" ADD CONSTRAINT "field_showcase_numbers_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."field_showcase"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "field_showcase_rels" ADD CONSTRAINT "field_showcase_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."field_showcase"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "field_showcase_rels" ADD CONSTRAINT "field_showcase_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "field_showcase_rels" ADD CONSTRAINT "field_showcase_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "field_showcase_rels" ADD CONSTRAINT "field_showcase_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "field_showcase_rels" ADD CONSTRAINT "field_showcase_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_field_showcase_v_version_select_many" ADD CONSTRAINT "_field_showcase_v_version_select_many_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_field_showcase_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_field_showcase_v_blocks_showcase_callout" ADD CONSTRAINT "_field_showcase_v_blocks_showcase_callout_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_field_showcase_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_field_showcase_v_blocks_showcase_quote" ADD CONSTRAINT "_field_showcase_v_blocks_showcase_quote_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_field_showcase_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_field_showcase_v_version_items" ADD CONSTRAINT "_field_showcase_v_version_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_field_showcase_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_field_showcase_v_version_meta_links" ADD CONSTRAINT "_field_showcase_v_version_meta_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_field_showcase_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_field_showcase_v" ADD CONSTRAINT "_field_showcase_v_parent_id_field_showcase_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."field_showcase"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_field_showcase_v" ADD CONSTRAINT "_field_showcase_v_version_tenant_id_tenants_id_fk" FOREIGN KEY ("version_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_field_showcase_v" ADD CONSTRAINT "_field_showcase_v_version_parent_id_field_showcase_id_fk" FOREIGN KEY ("version_parent_id") REFERENCES "public"."field_showcase"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_field_showcase_v" ADD CONSTRAINT "_field_showcase_v_version_image_id_media_id_fk" FOREIGN KEY ("version_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_field_showcase_v" ADD CONSTRAINT "_field_showcase_v_version_created_by_id_users_id_fk" FOREIGN KEY ("version_created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_field_showcase_v" ADD CONSTRAINT "_field_showcase_v_version_updated_by_id_users_id_fk" FOREIGN KEY ("version_updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_field_showcase_v_locales" ADD CONSTRAINT "_field_showcase_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_field_showcase_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_field_showcase_v_texts" ADD CONSTRAINT "_field_showcase_v_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_field_showcase_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_field_showcase_v_numbers" ADD CONSTRAINT "_field_showcase_v_numbers_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_field_showcase_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_field_showcase_v_rels" ADD CONSTRAINT "_field_showcase_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_field_showcase_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_field_showcase_v_rels" ADD CONSTRAINT "_field_showcase_v_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_field_showcase_v_rels" ADD CONSTRAINT "_field_showcase_v_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_field_showcase_v_rels" ADD CONSTRAINT "_field_showcase_v_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_field_showcase_v_rels" ADD CONSTRAINT "_field_showcase_v_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "field_showcase_select_many_order_idx" ON "field_showcase_select_many" USING btree ("order");
  CREATE INDEX "field_showcase_select_many_parent_idx" ON "field_showcase_select_many" USING btree ("parent_id");
  CREATE INDEX "field_showcase_blocks_showcase_callout_order_idx" ON "field_showcase_blocks_showcase_callout" USING btree ("_order");
  CREATE INDEX "field_showcase_blocks_showcase_callout_parent_id_idx" ON "field_showcase_blocks_showcase_callout" USING btree ("_parent_id");
  CREATE INDEX "field_showcase_blocks_showcase_callout_path_idx" ON "field_showcase_blocks_showcase_callout" USING btree ("_path");
  CREATE INDEX "field_showcase_blocks_showcase_quote_order_idx" ON "field_showcase_blocks_showcase_quote" USING btree ("_order");
  CREATE INDEX "field_showcase_blocks_showcase_quote_parent_id_idx" ON "field_showcase_blocks_showcase_quote" USING btree ("_parent_id");
  CREATE INDEX "field_showcase_blocks_showcase_quote_path_idx" ON "field_showcase_blocks_showcase_quote" USING btree ("_path");
  CREATE INDEX "field_showcase_items_order_idx" ON "field_showcase_items" USING btree ("_order");
  CREATE INDEX "field_showcase_items_parent_id_idx" ON "field_showcase_items" USING btree ("_parent_id");
  CREATE INDEX "field_showcase_meta_links_order_idx" ON "field_showcase_meta_links" USING btree ("_order");
  CREATE INDEX "field_showcase_meta_links_parent_id_idx" ON "field_showcase_meta_links" USING btree ("_parent_id");
  CREATE INDEX "field_showcase_tenant_idx" ON "field_showcase" USING btree ("tenant_id");
  CREATE INDEX "field_showcase_parent_idx" ON "field_showcase" USING btree ("parent_id");
  CREATE INDEX "field_showcase_image_idx" ON "field_showcase" USING btree ("image_id");
  CREATE INDEX "field_showcase_created_by_idx" ON "field_showcase" USING btree ("created_by_id");
  CREATE INDEX "field_showcase_updated_by_idx" ON "field_showcase" USING btree ("updated_by_id");
  CREATE INDEX "field_showcase_updated_at_idx" ON "field_showcase" USING btree ("updated_at");
  CREATE INDEX "field_showcase_created_at_idx" ON "field_showcase" USING btree ("created_at");
  CREATE INDEX "field_showcase__status_idx" ON "field_showcase" USING btree ("_status");
  CREATE UNIQUE INDEX "field_showcase_locales_locale_parent_id_unique" ON "field_showcase_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "field_showcase_texts_order_parent_idx" ON "field_showcase_texts" USING btree ("order","parent_id");
  CREATE INDEX "field_showcase_numbers_order_parent_idx" ON "field_showcase_numbers" USING btree ("order","parent_id");
  CREATE INDEX "field_showcase_rels_order_idx" ON "field_showcase_rels" USING btree ("order");
  CREATE INDEX "field_showcase_rels_parent_idx" ON "field_showcase_rels" USING btree ("parent_id");
  CREATE INDEX "field_showcase_rels_path_idx" ON "field_showcase_rels" USING btree ("path");
  CREATE INDEX "field_showcase_rels_users_id_idx" ON "field_showcase_rels" USING btree ("users_id");
  CREATE INDEX "field_showcase_rels_pages_id_idx" ON "field_showcase_rels" USING btree ("pages_id");
  CREATE INDEX "field_showcase_rels_posts_id_idx" ON "field_showcase_rels" USING btree ("posts_id");
  CREATE INDEX "field_showcase_rels_media_id_idx" ON "field_showcase_rels" USING btree ("media_id");
  CREATE INDEX "_field_showcase_v_version_select_many_order_idx" ON "_field_showcase_v_version_select_many" USING btree ("order");
  CREATE INDEX "_field_showcase_v_version_select_many_parent_idx" ON "_field_showcase_v_version_select_many" USING btree ("parent_id");
  CREATE INDEX "_field_showcase_v_blocks_showcase_callout_order_idx" ON "_field_showcase_v_blocks_showcase_callout" USING btree ("_order");
  CREATE INDEX "_field_showcase_v_blocks_showcase_callout_parent_id_idx" ON "_field_showcase_v_blocks_showcase_callout" USING btree ("_parent_id");
  CREATE INDEX "_field_showcase_v_blocks_showcase_callout_path_idx" ON "_field_showcase_v_blocks_showcase_callout" USING btree ("_path");
  CREATE INDEX "_field_showcase_v_blocks_showcase_quote_order_idx" ON "_field_showcase_v_blocks_showcase_quote" USING btree ("_order");
  CREATE INDEX "_field_showcase_v_blocks_showcase_quote_parent_id_idx" ON "_field_showcase_v_blocks_showcase_quote" USING btree ("_parent_id");
  CREATE INDEX "_field_showcase_v_blocks_showcase_quote_path_idx" ON "_field_showcase_v_blocks_showcase_quote" USING btree ("_path");
  CREATE INDEX "_field_showcase_v_version_items_order_idx" ON "_field_showcase_v_version_items" USING btree ("_order");
  CREATE INDEX "_field_showcase_v_version_items_parent_id_idx" ON "_field_showcase_v_version_items" USING btree ("_parent_id");
  CREATE INDEX "_field_showcase_v_version_meta_links_order_idx" ON "_field_showcase_v_version_meta_links" USING btree ("_order");
  CREATE INDEX "_field_showcase_v_version_meta_links_parent_id_idx" ON "_field_showcase_v_version_meta_links" USING btree ("_parent_id");
  CREATE INDEX "_field_showcase_v_parent_idx" ON "_field_showcase_v" USING btree ("parent_id");
  CREATE INDEX "_field_showcase_v_version_version_tenant_idx" ON "_field_showcase_v" USING btree ("version_tenant_id");
  CREATE INDEX "_field_showcase_v_version_version_parent_idx" ON "_field_showcase_v" USING btree ("version_parent_id");
  CREATE INDEX "_field_showcase_v_version_version_image_idx" ON "_field_showcase_v" USING btree ("version_image_id");
  CREATE INDEX "_field_showcase_v_version_version_created_by_idx" ON "_field_showcase_v" USING btree ("version_created_by_id");
  CREATE INDEX "_field_showcase_v_version_version_updated_by_idx" ON "_field_showcase_v" USING btree ("version_updated_by_id");
  CREATE INDEX "_field_showcase_v_version_version_updated_at_idx" ON "_field_showcase_v" USING btree ("version_updated_at");
  CREATE INDEX "_field_showcase_v_version_version_created_at_idx" ON "_field_showcase_v" USING btree ("version_created_at");
  CREATE INDEX "_field_showcase_v_version_version__status_idx" ON "_field_showcase_v" USING btree ("version__status");
  CREATE INDEX "_field_showcase_v_created_at_idx" ON "_field_showcase_v" USING btree ("created_at");
  CREATE INDEX "_field_showcase_v_updated_at_idx" ON "_field_showcase_v" USING btree ("updated_at");
  CREATE INDEX "_field_showcase_v_snapshot_idx" ON "_field_showcase_v" USING btree ("snapshot");
  CREATE INDEX "_field_showcase_v_published_locale_idx" ON "_field_showcase_v" USING btree ("published_locale");
  CREATE INDEX "_field_showcase_v_latest_idx" ON "_field_showcase_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_field_showcase_v_locales_locale_parent_id_unique" ON "_field_showcase_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_field_showcase_v_texts_order_parent_idx" ON "_field_showcase_v_texts" USING btree ("order","parent_id");
  CREATE INDEX "_field_showcase_v_numbers_order_parent_idx" ON "_field_showcase_v_numbers" USING btree ("order","parent_id");
  CREATE INDEX "_field_showcase_v_rels_order_idx" ON "_field_showcase_v_rels" USING btree ("order");
  CREATE INDEX "_field_showcase_v_rels_parent_idx" ON "_field_showcase_v_rels" USING btree ("parent_id");
  CREATE INDEX "_field_showcase_v_rels_path_idx" ON "_field_showcase_v_rels" USING btree ("path");
  CREATE INDEX "_field_showcase_v_rels_users_id_idx" ON "_field_showcase_v_rels" USING btree ("users_id");
  CREATE INDEX "_field_showcase_v_rels_pages_id_idx" ON "_field_showcase_v_rels" USING btree ("pages_id");
  CREATE INDEX "_field_showcase_v_rels_posts_id_idx" ON "_field_showcase_v_rels" USING btree ("posts_id");
  CREATE INDEX "_field_showcase_v_rels_media_id_idx" ON "_field_showcase_v_rels" USING btree ("media_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_field_showcase_fk" FOREIGN KEY ("field_showcase_id") REFERENCES "public"."field_showcase"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_field_showcase_id_idx" ON "payload_locked_documents_rels" USING btree ("field_showcase_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "field_showcase_select_many" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "field_showcase_blocks_showcase_callout" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "field_showcase_blocks_showcase_quote" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "field_showcase_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "field_showcase_meta_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "field_showcase" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "field_showcase_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "field_showcase_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "field_showcase_numbers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "field_showcase_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_field_showcase_v_version_select_many" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_field_showcase_v_blocks_showcase_callout" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_field_showcase_v_blocks_showcase_quote" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_field_showcase_v_version_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_field_showcase_v_version_meta_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_field_showcase_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_field_showcase_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_field_showcase_v_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_field_showcase_v_numbers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_field_showcase_v_rels" DISABLE ROW LEVEL SECURITY;
  -- Payload's generator drops the tables (CASCADE) before this FK, which the cascade already
  -- removed, so down failed: drop it first
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_field_showcase_fk";
  DROP TABLE "field_showcase_select_many" CASCADE;
  DROP TABLE "field_showcase_blocks_showcase_callout" CASCADE;
  DROP TABLE "field_showcase_blocks_showcase_quote" CASCADE;
  DROP TABLE "field_showcase_items" CASCADE;
  DROP TABLE "field_showcase_meta_links" CASCADE;
  DROP TABLE "field_showcase" CASCADE;
  DROP TABLE "field_showcase_locales" CASCADE;
  DROP TABLE "field_showcase_texts" CASCADE;
  DROP TABLE "field_showcase_numbers" CASCADE;
  DROP TABLE "field_showcase_rels" CASCADE;
  DROP TABLE "_field_showcase_v_version_select_many" CASCADE;
  DROP TABLE "_field_showcase_v_blocks_showcase_callout" CASCADE;
  DROP TABLE "_field_showcase_v_blocks_showcase_quote" CASCADE;
  DROP TABLE "_field_showcase_v_version_items" CASCADE;
  DROP TABLE "_field_showcase_v_version_meta_links" CASCADE;
  DROP TABLE "_field_showcase_v" CASCADE;
  DROP TABLE "_field_showcase_v_locales" CASCADE;
  DROP TABLE "_field_showcase_v_texts" CASCADE;
  DROP TABLE "_field_showcase_v_numbers" CASCADE;
  DROP TABLE "_field_showcase_v_rels" CASCADE;
  
  -- profiles get a row for every collection, so rows for this slug exist once a profile is saved:
  -- remove them first, or the cast back to the old enum fails
  DELETE FROM "users_access_access" WHERE "slug" = 'field-showcase';
  ALTER TABLE "users_access_access" ALTER COLUMN "slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_users_access_access_slug";
  CREATE TYPE "public"."enum_users_access_access_slug" AS ENUM('pages', 'posts', 'media', 'categories', 'users', 'users-access', 'analytics', 'tenants', 'header', 'footer', 'theme', 'settings', 'audit-logs', 'redirects', 'forms', 'form-submissions', 'search');
  ALTER TABLE "users_access_access" ALTER COLUMN "slug" SET DATA TYPE "public"."enum_users_access_access_slug" USING "slug"::"public"."enum_users_access_access_slug";
  DROP INDEX "payload_locked_documents_rels_field_showcase_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "field_showcase_id";
  DROP TYPE "public"."enum_field_showcase_select_many";
  DROP TYPE "public"."enum_field_showcase_blocks_showcase_callout_tone";
  DROP TYPE "public"."enum_field_showcase_select_single";
  DROP TYPE "public"."enum_field_showcase_select_long";
  DROP TYPE "public"."enum_field_showcase_radio";
  DROP TYPE "public"."enum_field_showcase_radio_horizontal";
  DROP TYPE "public"."enum_field_showcase_meta_level";
  DROP TYPE "public"."enum_field_showcase_stage";
  DROP TYPE "public"."enum_field_showcase_status";
  DROP TYPE "public"."enum__field_showcase_v_version_select_many";
  DROP TYPE "public"."enum__field_showcase_v_blocks_showcase_callout_tone";
  DROP TYPE "public"."enum__field_showcase_v_version_select_single";
  DROP TYPE "public"."enum__field_showcase_v_version_select_long";
  DROP TYPE "public"."enum__field_showcase_v_version_radio";
  DROP TYPE "public"."enum__field_showcase_v_version_radio_horizontal";
  DROP TYPE "public"."enum__field_showcase_v_version_meta_level";
  DROP TYPE "public"."enum__field_showcase_v_version_stage";
  DROP TYPE "public"."enum__field_showcase_v_version_status";
  DROP TYPE "public"."enum__field_showcase_v_published_locale";`)
}

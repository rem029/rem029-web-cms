import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_field_showcase_global_select_many" AS ENUM('red', 'green', 'blue');
  CREATE TYPE "public"."enum_field_showcase_global_blocks_showcase_callout_tone" AS ENUM('info', 'success', 'warning', 'danger');
  CREATE TYPE "public"."enum_field_showcase_global_labels" AS ENUM('apple', 'banana', 'cherry', 'date', 'elderberry', 'fig', 'grape', 'honeydew', 'kiwi', 'lemon', 'mango', 'nectarine');
  CREATE TYPE "public"."enum_field_showcase_global_select_single" AS ENUM('small', 'medium', 'large');
  CREATE TYPE "public"."enum_field_showcase_global_select_long" AS ENUM('apple', 'banana', 'cherry', 'date', 'elderberry', 'fig', 'grape', 'honeydew', 'kiwi', 'lemon', 'mango', 'nectarine');
  CREATE TYPE "public"."enum_field_showcase_global_radio" AS ENUM('morning', 'afternoon', 'evening');
  CREATE TYPE "public"."enum_field_showcase_global_radio_horizontal" AS ENUM('yes', 'no', 'maybe');
  CREATE TYPE "public"."enum_field_showcase_global_meta_level" AS ENUM('low', 'high');
  CREATE TYPE "public"."enum_field_showcase_global_stage" AS ENUM('idea', 'review', 'done');
  CREATE TYPE "public"."enum_field_showcase_global_visibility" AS ENUM('me', 'team', 'everyone');
  CREATE TYPE "public"."enum_field_showcase_global_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__field_showcase_global_v_version_select_many" AS ENUM('red', 'green', 'blue');
  CREATE TYPE "public"."enum__field_showcase_global_v_blocks_showcase_callout_tone" AS ENUM('info', 'success', 'warning', 'danger');
  CREATE TYPE "public"."enum__field_showcase_global_v_version_labels" AS ENUM('apple', 'banana', 'cherry', 'date', 'elderberry', 'fig', 'grape', 'honeydew', 'kiwi', 'lemon', 'mango', 'nectarine');
  CREATE TYPE "public"."enum__field_showcase_global_v_version_select_single" AS ENUM('small', 'medium', 'large');
  CREATE TYPE "public"."enum__field_showcase_global_v_version_select_long" AS ENUM('apple', 'banana', 'cherry', 'date', 'elderberry', 'fig', 'grape', 'honeydew', 'kiwi', 'lemon', 'mango', 'nectarine');
  CREATE TYPE "public"."enum__field_showcase_global_v_version_radio" AS ENUM('morning', 'afternoon', 'evening');
  CREATE TYPE "public"."enum__field_showcase_global_v_version_radio_horizontal" AS ENUM('yes', 'no', 'maybe');
  CREATE TYPE "public"."enum__field_showcase_global_v_version_meta_level" AS ENUM('low', 'high');
  CREATE TYPE "public"."enum__field_showcase_global_v_version_stage" AS ENUM('idea', 'review', 'done');
  CREATE TYPE "public"."enum__field_showcase_global_v_version_visibility" AS ENUM('me', 'team', 'everyone');
  CREATE TYPE "public"."enum__field_showcase_global_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__field_showcase_global_v_published_locale" AS ENUM('en', 'ar');
  ALTER TYPE "public"."enum_users_access_access_slug" ADD VALUE 'field-showcase-global';
  CREATE TABLE "field_showcase_global_select_many" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_field_showcase_global_select_many",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "field_showcase_global_blocks_showcase_callout" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"tone" "enum_field_showcase_global_blocks_showcase_callout_tone" DEFAULT 'info',
  	"text" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "field_showcase_global_blocks_showcase_quote" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"quote" varchar,
  	"author" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "field_showcase_global_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"done" boolean
  );
  
  CREATE TABLE "field_showcase_global_meta_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"url" varchar
  );
  
  CREATE TABLE "field_showcase_global_labels" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_field_showcase_global_labels",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "field_showcase_global" (
  	"id" serial PRIMARY KEY NOT NULL,
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
  	"select_single" "enum_field_showcase_global_select_single",
  	"select_long" "enum_field_showcase_global_select_long",
  	"radio" "enum_field_showcase_global_radio",
  	"radio_horizontal" "enum_field_showcase_global_radio_horizontal",
  	"date_time" timestamp(3) with time zone,
  	"date_day" timestamp(3) with time zone,
  	"date_month" timestamp(3) with time zone,
  	"date_time_only" timestamp(3) with time zone,
  	"image_id" integer,
  	"page_drawer_id" integer,
  	"rich_text" jsonb,
  	"meta_note" varchar,
  	"meta_level" "enum_field_showcase_global_meta_level",
  	"first_name" varchar,
  	"last_name" varchar,
  	"open_note" varchar,
  	"closed_note" varchar,
  	"named_tab_note" varchar,
  	"stage" "enum_field_showcase_global_stage" DEFAULT 'idea',
  	"featured" boolean,
  	"reviewed_at" timestamp(3) with time zone,
  	"priority" numeric,
  	"visibility" "enum_field_showcase_global_visibility" DEFAULT 'team',
  	"reviewer_id" integer,
  	"owner" varchar,
  	"summary" varchar,
  	"remind_at" timestamp(3) with time zone,
  	"_status" "enum_field_showcase_global_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "field_showcase_global_locales" (
  	"text_localized" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "field_showcase_global_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "field_showcase_global_numbers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"number" numeric,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL
  );
  
  CREATE TABLE "field_showcase_global_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"pages_id" integer,
  	"posts_id" integer,
  	"media_id" integer
  );
  
  CREATE TABLE "_field_showcase_global_v_version_select_many" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum__field_showcase_global_v_version_select_many",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "_field_showcase_global_v_blocks_showcase_callout" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"tone" "enum__field_showcase_global_v_blocks_showcase_callout_tone" DEFAULT 'info',
  	"text" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_field_showcase_global_v_blocks_showcase_quote" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"quote" varchar,
  	"author" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_field_showcase_global_v_version_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"done" boolean,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_field_showcase_global_v_version_meta_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"url" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_field_showcase_global_v_version_labels" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum__field_showcase_global_v_version_labels",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "_field_showcase_global_v" (
  	"id" serial PRIMARY KEY NOT NULL,
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
  	"version_select_single" "enum__field_showcase_global_v_version_select_single",
  	"version_select_long" "enum__field_showcase_global_v_version_select_long",
  	"version_radio" "enum__field_showcase_global_v_version_radio",
  	"version_radio_horizontal" "enum__field_showcase_global_v_version_radio_horizontal",
  	"version_date_time" timestamp(3) with time zone,
  	"version_date_day" timestamp(3) with time zone,
  	"version_date_month" timestamp(3) with time zone,
  	"version_date_time_only" timestamp(3) with time zone,
  	"version_image_id" integer,
  	"version_page_drawer_id" integer,
  	"version_rich_text" jsonb,
  	"version_meta_note" varchar,
  	"version_meta_level" "enum__field_showcase_global_v_version_meta_level",
  	"version_first_name" varchar,
  	"version_last_name" varchar,
  	"version_open_note" varchar,
  	"version_closed_note" varchar,
  	"version_named_tab_note" varchar,
  	"version_stage" "enum__field_showcase_global_v_version_stage" DEFAULT 'idea',
  	"version_featured" boolean,
  	"version_reviewed_at" timestamp(3) with time zone,
  	"version_priority" numeric,
  	"version_visibility" "enum__field_showcase_global_v_version_visibility" DEFAULT 'team',
  	"version_reviewer_id" integer,
  	"version_owner" varchar,
  	"version_summary" varchar,
  	"version_remind_at" timestamp(3) with time zone,
  	"version__status" "enum__field_showcase_global_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__field_showcase_global_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_field_showcase_global_v_locales" (
  	"version_text_localized" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_field_showcase_global_v_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "_field_showcase_global_v_numbers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"number" numeric,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL
  );
  
  CREATE TABLE "_field_showcase_global_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"pages_id" integer,
  	"posts_id" integer,
  	"media_id" integer
  );
  
  ALTER TABLE "field_showcase" ADD COLUMN "page_drawer_id" integer;
  ALTER TABLE "field_showcase" ADD COLUMN "named_tab_note" varchar;
  ALTER TABLE "_field_showcase_v" ADD COLUMN "version_page_drawer_id" integer;
  ALTER TABLE "_field_showcase_v" ADD COLUMN "version_named_tab_note" varchar;
  ALTER TABLE "field_showcase_global_select_many" ADD CONSTRAINT "field_showcase_global_select_many_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."field_showcase_global"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "field_showcase_global_blocks_showcase_callout" ADD CONSTRAINT "field_showcase_global_blocks_showcase_callout_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."field_showcase_global"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "field_showcase_global_blocks_showcase_quote" ADD CONSTRAINT "field_showcase_global_blocks_showcase_quote_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."field_showcase_global"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "field_showcase_global_items" ADD CONSTRAINT "field_showcase_global_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."field_showcase_global"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "field_showcase_global_meta_links" ADD CONSTRAINT "field_showcase_global_meta_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."field_showcase_global"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "field_showcase_global_labels" ADD CONSTRAINT "field_showcase_global_labels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."field_showcase_global"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "field_showcase_global" ADD CONSTRAINT "field_showcase_global_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "field_showcase_global" ADD CONSTRAINT "field_showcase_global_page_drawer_id_pages_id_fk" FOREIGN KEY ("page_drawer_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "field_showcase_global" ADD CONSTRAINT "field_showcase_global_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "field_showcase_global_locales" ADD CONSTRAINT "field_showcase_global_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."field_showcase_global"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "field_showcase_global_texts" ADD CONSTRAINT "field_showcase_global_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."field_showcase_global"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "field_showcase_global_numbers" ADD CONSTRAINT "field_showcase_global_numbers_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."field_showcase_global"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "field_showcase_global_rels" ADD CONSTRAINT "field_showcase_global_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."field_showcase_global"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "field_showcase_global_rels" ADD CONSTRAINT "field_showcase_global_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "field_showcase_global_rels" ADD CONSTRAINT "field_showcase_global_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "field_showcase_global_rels" ADD CONSTRAINT "field_showcase_global_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "field_showcase_global_rels" ADD CONSTRAINT "field_showcase_global_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_field_showcase_global_v_version_select_many" ADD CONSTRAINT "_field_showcase_global_v_version_select_many_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_field_showcase_global_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_field_showcase_global_v_blocks_showcase_callout" ADD CONSTRAINT "_field_showcase_global_v_blocks_showcase_callout_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_field_showcase_global_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_field_showcase_global_v_blocks_showcase_quote" ADD CONSTRAINT "_field_showcase_global_v_blocks_showcase_quote_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_field_showcase_global_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_field_showcase_global_v_version_items" ADD CONSTRAINT "_field_showcase_global_v_version_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_field_showcase_global_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_field_showcase_global_v_version_meta_links" ADD CONSTRAINT "_field_showcase_global_v_version_meta_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_field_showcase_global_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_field_showcase_global_v_version_labels" ADD CONSTRAINT "_field_showcase_global_v_version_labels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_field_showcase_global_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_field_showcase_global_v" ADD CONSTRAINT "_field_showcase_global_v_version_image_id_media_id_fk" FOREIGN KEY ("version_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_field_showcase_global_v" ADD CONSTRAINT "_field_showcase_global_v_version_page_drawer_id_pages_id_fk" FOREIGN KEY ("version_page_drawer_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_field_showcase_global_v" ADD CONSTRAINT "_field_showcase_global_v_version_reviewer_id_users_id_fk" FOREIGN KEY ("version_reviewer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_field_showcase_global_v_locales" ADD CONSTRAINT "_field_showcase_global_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_field_showcase_global_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_field_showcase_global_v_texts" ADD CONSTRAINT "_field_showcase_global_v_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_field_showcase_global_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_field_showcase_global_v_numbers" ADD CONSTRAINT "_field_showcase_global_v_numbers_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_field_showcase_global_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_field_showcase_global_v_rels" ADD CONSTRAINT "_field_showcase_global_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_field_showcase_global_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_field_showcase_global_v_rels" ADD CONSTRAINT "_field_showcase_global_v_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_field_showcase_global_v_rels" ADD CONSTRAINT "_field_showcase_global_v_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_field_showcase_global_v_rels" ADD CONSTRAINT "_field_showcase_global_v_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_field_showcase_global_v_rels" ADD CONSTRAINT "_field_showcase_global_v_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "field_showcase_global_select_many_order_idx" ON "field_showcase_global_select_many" USING btree ("order");
  CREATE INDEX "field_showcase_global_select_many_parent_idx" ON "field_showcase_global_select_many" USING btree ("parent_id");
  CREATE INDEX "field_showcase_global_blocks_showcase_callout_order_idx" ON "field_showcase_global_blocks_showcase_callout" USING btree ("_order");
  CREATE INDEX "field_showcase_global_blocks_showcase_callout_parent_id_idx" ON "field_showcase_global_blocks_showcase_callout" USING btree ("_parent_id");
  CREATE INDEX "field_showcase_global_blocks_showcase_callout_path_idx" ON "field_showcase_global_blocks_showcase_callout" USING btree ("_path");
  CREATE INDEX "field_showcase_global_blocks_showcase_quote_order_idx" ON "field_showcase_global_blocks_showcase_quote" USING btree ("_order");
  CREATE INDEX "field_showcase_global_blocks_showcase_quote_parent_id_idx" ON "field_showcase_global_blocks_showcase_quote" USING btree ("_parent_id");
  CREATE INDEX "field_showcase_global_blocks_showcase_quote_path_idx" ON "field_showcase_global_blocks_showcase_quote" USING btree ("_path");
  CREATE INDEX "field_showcase_global_items_order_idx" ON "field_showcase_global_items" USING btree ("_order");
  CREATE INDEX "field_showcase_global_items_parent_id_idx" ON "field_showcase_global_items" USING btree ("_parent_id");
  CREATE INDEX "field_showcase_global_meta_links_order_idx" ON "field_showcase_global_meta_links" USING btree ("_order");
  CREATE INDEX "field_showcase_global_meta_links_parent_id_idx" ON "field_showcase_global_meta_links" USING btree ("_parent_id");
  CREATE INDEX "field_showcase_global_labels_order_idx" ON "field_showcase_global_labels" USING btree ("order");
  CREATE INDEX "field_showcase_global_labels_parent_idx" ON "field_showcase_global_labels" USING btree ("parent_id");
  CREATE INDEX "field_showcase_global_image_idx" ON "field_showcase_global" USING btree ("image_id");
  CREATE INDEX "field_showcase_global_page_drawer_idx" ON "field_showcase_global" USING btree ("page_drawer_id");
  CREATE INDEX "field_showcase_global_reviewer_idx" ON "field_showcase_global" USING btree ("reviewer_id");
  CREATE INDEX "field_showcase_global__status_idx" ON "field_showcase_global" USING btree ("_status");
  CREATE UNIQUE INDEX "field_showcase_global_locales_locale_parent_id_unique" ON "field_showcase_global_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "field_showcase_global_texts_order_parent_idx" ON "field_showcase_global_texts" USING btree ("order","parent_id");
  CREATE INDEX "field_showcase_global_numbers_order_parent_idx" ON "field_showcase_global_numbers" USING btree ("order","parent_id");
  CREATE INDEX "field_showcase_global_rels_order_idx" ON "field_showcase_global_rels" USING btree ("order");
  CREATE INDEX "field_showcase_global_rels_parent_idx" ON "field_showcase_global_rels" USING btree ("parent_id");
  CREATE INDEX "field_showcase_global_rels_path_idx" ON "field_showcase_global_rels" USING btree ("path");
  CREATE INDEX "field_showcase_global_rels_users_id_idx" ON "field_showcase_global_rels" USING btree ("users_id");
  CREATE INDEX "field_showcase_global_rels_pages_id_idx" ON "field_showcase_global_rels" USING btree ("pages_id");
  CREATE INDEX "field_showcase_global_rels_posts_id_idx" ON "field_showcase_global_rels" USING btree ("posts_id");
  CREATE INDEX "field_showcase_global_rels_media_id_idx" ON "field_showcase_global_rels" USING btree ("media_id");
  CREATE INDEX "_field_showcase_global_v_version_select_many_order_idx" ON "_field_showcase_global_v_version_select_many" USING btree ("order");
  CREATE INDEX "_field_showcase_global_v_version_select_many_parent_idx" ON "_field_showcase_global_v_version_select_many" USING btree ("parent_id");
  CREATE INDEX "_field_showcase_global_v_blocks_showcase_callout_order_idx" ON "_field_showcase_global_v_blocks_showcase_callout" USING btree ("_order");
  CREATE INDEX "_field_showcase_global_v_blocks_showcase_callout_parent_id_idx" ON "_field_showcase_global_v_blocks_showcase_callout" USING btree ("_parent_id");
  CREATE INDEX "_field_showcase_global_v_blocks_showcase_callout_path_idx" ON "_field_showcase_global_v_blocks_showcase_callout" USING btree ("_path");
  CREATE INDEX "_field_showcase_global_v_blocks_showcase_quote_order_idx" ON "_field_showcase_global_v_blocks_showcase_quote" USING btree ("_order");
  CREATE INDEX "_field_showcase_global_v_blocks_showcase_quote_parent_id_idx" ON "_field_showcase_global_v_blocks_showcase_quote" USING btree ("_parent_id");
  CREATE INDEX "_field_showcase_global_v_blocks_showcase_quote_path_idx" ON "_field_showcase_global_v_blocks_showcase_quote" USING btree ("_path");
  CREATE INDEX "_field_showcase_global_v_version_items_order_idx" ON "_field_showcase_global_v_version_items" USING btree ("_order");
  CREATE INDEX "_field_showcase_global_v_version_items_parent_id_idx" ON "_field_showcase_global_v_version_items" USING btree ("_parent_id");
  CREATE INDEX "_field_showcase_global_v_version_meta_links_order_idx" ON "_field_showcase_global_v_version_meta_links" USING btree ("_order");
  CREATE INDEX "_field_showcase_global_v_version_meta_links_parent_id_idx" ON "_field_showcase_global_v_version_meta_links" USING btree ("_parent_id");
  CREATE INDEX "_field_showcase_global_v_version_labels_order_idx" ON "_field_showcase_global_v_version_labels" USING btree ("order");
  CREATE INDEX "_field_showcase_global_v_version_labels_parent_idx" ON "_field_showcase_global_v_version_labels" USING btree ("parent_id");
  CREATE INDEX "_field_showcase_global_v_version_version_image_idx" ON "_field_showcase_global_v" USING btree ("version_image_id");
  CREATE INDEX "_field_showcase_global_v_version_version_page_drawer_idx" ON "_field_showcase_global_v" USING btree ("version_page_drawer_id");
  CREATE INDEX "_field_showcase_global_v_version_version_reviewer_idx" ON "_field_showcase_global_v" USING btree ("version_reviewer_id");
  CREATE INDEX "_field_showcase_global_v_version_version__status_idx" ON "_field_showcase_global_v" USING btree ("version__status");
  CREATE INDEX "_field_showcase_global_v_created_at_idx" ON "_field_showcase_global_v" USING btree ("created_at");
  CREATE INDEX "_field_showcase_global_v_updated_at_idx" ON "_field_showcase_global_v" USING btree ("updated_at");
  CREATE INDEX "_field_showcase_global_v_snapshot_idx" ON "_field_showcase_global_v" USING btree ("snapshot");
  CREATE INDEX "_field_showcase_global_v_published_locale_idx" ON "_field_showcase_global_v" USING btree ("published_locale");
  CREATE INDEX "_field_showcase_global_v_latest_idx" ON "_field_showcase_global_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_field_showcase_global_v_locales_locale_parent_id_unique" ON "_field_showcase_global_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_field_showcase_global_v_texts_order_parent_idx" ON "_field_showcase_global_v_texts" USING btree ("order","parent_id");
  CREATE INDEX "_field_showcase_global_v_numbers_order_parent_idx" ON "_field_showcase_global_v_numbers" USING btree ("order","parent_id");
  CREATE INDEX "_field_showcase_global_v_rels_order_idx" ON "_field_showcase_global_v_rels" USING btree ("order");
  CREATE INDEX "_field_showcase_global_v_rels_parent_idx" ON "_field_showcase_global_v_rels" USING btree ("parent_id");
  CREATE INDEX "_field_showcase_global_v_rels_path_idx" ON "_field_showcase_global_v_rels" USING btree ("path");
  CREATE INDEX "_field_showcase_global_v_rels_users_id_idx" ON "_field_showcase_global_v_rels" USING btree ("users_id");
  CREATE INDEX "_field_showcase_global_v_rels_pages_id_idx" ON "_field_showcase_global_v_rels" USING btree ("pages_id");
  CREATE INDEX "_field_showcase_global_v_rels_posts_id_idx" ON "_field_showcase_global_v_rels" USING btree ("posts_id");
  CREATE INDEX "_field_showcase_global_v_rels_media_id_idx" ON "_field_showcase_global_v_rels" USING btree ("media_id");
  ALTER TABLE "field_showcase" ADD CONSTRAINT "field_showcase_page_drawer_id_pages_id_fk" FOREIGN KEY ("page_drawer_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_field_showcase_v" ADD CONSTRAINT "_field_showcase_v_version_page_drawer_id_pages_id_fk" FOREIGN KEY ("version_page_drawer_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "field_showcase_page_drawer_idx" ON "field_showcase" USING btree ("page_drawer_id");
  CREATE INDEX "_field_showcase_v_version_version_page_drawer_idx" ON "_field_showcase_v" USING btree ("version_page_drawer_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "field_showcase_global_select_many" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "field_showcase_global_blocks_showcase_callout" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "field_showcase_global_blocks_showcase_quote" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "field_showcase_global_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "field_showcase_global_meta_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "field_showcase_global_labels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "field_showcase_global" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "field_showcase_global_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "field_showcase_global_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "field_showcase_global_numbers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "field_showcase_global_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_field_showcase_global_v_version_select_many" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_field_showcase_global_v_blocks_showcase_callout" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_field_showcase_global_v_blocks_showcase_quote" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_field_showcase_global_v_version_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_field_showcase_global_v_version_meta_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_field_showcase_global_v_version_labels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_field_showcase_global_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_field_showcase_global_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_field_showcase_global_v_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_field_showcase_global_v_numbers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_field_showcase_global_v_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "field_showcase_global_select_many" CASCADE;
  DROP TABLE "field_showcase_global_blocks_showcase_callout" CASCADE;
  DROP TABLE "field_showcase_global_blocks_showcase_quote" CASCADE;
  DROP TABLE "field_showcase_global_items" CASCADE;
  DROP TABLE "field_showcase_global_meta_links" CASCADE;
  DROP TABLE "field_showcase_global_labels" CASCADE;
  DROP TABLE "field_showcase_global" CASCADE;
  DROP TABLE "field_showcase_global_locales" CASCADE;
  DROP TABLE "field_showcase_global_texts" CASCADE;
  DROP TABLE "field_showcase_global_numbers" CASCADE;
  DROP TABLE "field_showcase_global_rels" CASCADE;
  DROP TABLE "_field_showcase_global_v_version_select_many" CASCADE;
  DROP TABLE "_field_showcase_global_v_blocks_showcase_callout" CASCADE;
  DROP TABLE "_field_showcase_global_v_blocks_showcase_quote" CASCADE;
  DROP TABLE "_field_showcase_global_v_version_items" CASCADE;
  DROP TABLE "_field_showcase_global_v_version_meta_links" CASCADE;
  DROP TABLE "_field_showcase_global_v_version_labels" CASCADE;
  DROP TABLE "_field_showcase_global_v" CASCADE;
  DROP TABLE "_field_showcase_global_v_locales" CASCADE;
  DROP TABLE "_field_showcase_global_v_texts" CASCADE;
  DROP TABLE "_field_showcase_global_v_numbers" CASCADE;
  DROP TABLE "_field_showcase_global_v_rels" CASCADE;
  ALTER TABLE "field_showcase" DROP CONSTRAINT "field_showcase_page_drawer_id_pages_id_fk";
  
  ALTER TABLE "_field_showcase_v" DROP CONSTRAINT "_field_showcase_v_version_page_drawer_id_pages_id_fk";
  
  -- profile rows for the global would fail the cast back to the enum without its value: remove them
  DELETE FROM "users_access_access" WHERE "slug" = 'field-showcase-global';
  ALTER TABLE "users_access_access" ALTER COLUMN "slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_users_access_access_slug";
  CREATE TYPE "public"."enum_users_access_access_slug" AS ENUM('pages', 'posts', 'media', 'categories', 'users', 'users-access', 'analytics', 'tenants', 'header', 'footer', 'theme', 'settings', 'audit-logs', 'field-showcase', 'redirects', 'forms', 'form-submissions', 'search');
  ALTER TABLE "users_access_access" ALTER COLUMN "slug" SET DATA TYPE "public"."enum_users_access_access_slug" USING "slug"::"public"."enum_users_access_access_slug";
  DROP INDEX "field_showcase_page_drawer_idx";
  DROP INDEX "_field_showcase_v_version_version_page_drawer_idx";
  ALTER TABLE "field_showcase" DROP COLUMN "page_drawer_id";
  ALTER TABLE "field_showcase" DROP COLUMN "named_tab_note";
  ALTER TABLE "_field_showcase_v" DROP COLUMN "version_page_drawer_id";
  ALTER TABLE "_field_showcase_v" DROP COLUMN "version_named_tab_note";
  DROP TYPE "public"."enum_field_showcase_global_select_many";
  DROP TYPE "public"."enum_field_showcase_global_blocks_showcase_callout_tone";
  DROP TYPE "public"."enum_field_showcase_global_labels";
  DROP TYPE "public"."enum_field_showcase_global_select_single";
  DROP TYPE "public"."enum_field_showcase_global_select_long";
  DROP TYPE "public"."enum_field_showcase_global_radio";
  DROP TYPE "public"."enum_field_showcase_global_radio_horizontal";
  DROP TYPE "public"."enum_field_showcase_global_meta_level";
  DROP TYPE "public"."enum_field_showcase_global_stage";
  DROP TYPE "public"."enum_field_showcase_global_visibility";
  DROP TYPE "public"."enum_field_showcase_global_status";
  DROP TYPE "public"."enum__field_showcase_global_v_version_select_many";
  DROP TYPE "public"."enum__field_showcase_global_v_blocks_showcase_callout_tone";
  DROP TYPE "public"."enum__field_showcase_global_v_version_labels";
  DROP TYPE "public"."enum__field_showcase_global_v_version_select_single";
  DROP TYPE "public"."enum__field_showcase_global_v_version_select_long";
  DROP TYPE "public"."enum__field_showcase_global_v_version_radio";
  DROP TYPE "public"."enum__field_showcase_global_v_version_radio_horizontal";
  DROP TYPE "public"."enum__field_showcase_global_v_version_meta_level";
  DROP TYPE "public"."enum__field_showcase_global_v_version_stage";
  DROP TYPE "public"."enum__field_showcase_global_v_version_visibility";
  DROP TYPE "public"."enum__field_showcase_global_v_version_status";
  DROP TYPE "public"."enum__field_showcase_global_v_published_locale";`)
}

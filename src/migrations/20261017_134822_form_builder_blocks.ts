import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_forms_blocks_radio_direction" AS ENUM('column', 'row');
  CREATE TYPE "public"."enum_forms_blocks_rating_display" AS ENUM('stars', 'buttons');
  CREATE TYPE "public"."enum_forms_blocks_image_size" AS ENUM('small', 'medium', 'full');
  CREATE TYPE "public"."enum_forms_blocks_conditional_operator" AS ENUM('equal', 'not_equal', 'contains', 'not_contains');
  CREATE TABLE "forms_blocks_radio_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar NOT NULL
  );
  
  CREATE TABLE "forms_blocks_radio_options_locales" (
  	"label" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "forms_blocks_radio" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"width" numeric,
  	"required" boolean,
  	"css_class" varchar,
  	"direction" "enum_forms_blocks_radio_direction" DEFAULT 'column',
  	"block_name" varchar
  );
  
  CREATE TABLE "forms_blocks_radio_locales" (
  	"label" varchar,
  	"default_value" varchar,
  	"help_text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "forms_blocks_date" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"width" numeric,
  	"required" boolean,
  	"default_value" timestamp(3) with time zone,
  	"css_class" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "forms_blocks_date_locales" (
  	"label" varchar,
  	"help_text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "forms_blocks_file" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"width" numeric,
  	"required" boolean,
  	"css_class" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "forms_blocks_file_locales" (
  	"label" varchar,
  	"help_text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "forms_blocks_signature" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"width" numeric,
  	"required" boolean,
  	"css_class" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "forms_blocks_signature_locales" (
  	"label" varchar,
  	"help_text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "forms_blocks_phone" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"width" numeric,
  	"required" boolean,
  	"css_class" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "forms_blocks_phone_locales" (
  	"label" varchar,
  	"help_text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "forms_blocks_time" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"width" numeric,
  	"required" boolean,
  	"css_class" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "forms_blocks_time_locales" (
  	"label" varchar,
  	"help_text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "forms_blocks_rating_labels" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "forms_blocks_rating_labels_locales" (
  	"label" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "forms_blocks_rating" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"width" numeric,
  	"required" boolean,
  	"css_class" varchar,
  	"point_count" numeric DEFAULT 5,
  	"display" "enum_forms_blocks_rating_display" DEFAULT 'stars',
  	"block_name" varchar
  );
  
  CREATE TABLE "forms_blocks_rating_locales" (
  	"label" varchar,
  	"help_text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "forms_blocks_scale" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"width" numeric,
  	"required" boolean,
  	"css_class" varchar,
  	"min" numeric DEFAULT 0,
  	"max" numeric DEFAULT 10,
  	"step" numeric DEFAULT 1,
  	"block_name" varchar
  );
  
  CREATE TABLE "forms_blocks_scale_locales" (
  	"label" varchar,
  	"help_text" varchar,
  	"min_label" varchar,
  	"max_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "forms_blocks_image" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"media_id" integer NOT NULL,
  	"size" "enum_forms_blocks_image_size" DEFAULT 'full',
  	"css_class" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "forms_blocks_image_locales" (
  	"caption" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "forms_blocks_group" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"width" numeric,
  	"required" boolean,
  	"css_class" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "forms_blocks_group_locales" (
  	"label" varchar,
  	"help_text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "forms_blocks_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"width" numeric,
  	"required" boolean,
  	"css_class" varchar,
  	"max_items" numeric,
  	"block_name" varchar
  );
  
  CREATE TABLE "forms_blocks_list_locales" (
  	"label" varchar,
  	"help_text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "forms_blocks_conditional" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"condition_field" varchar NOT NULL,
  	"operator" "enum_forms_blocks_conditional_operator" DEFAULT 'equal' NOT NULL,
  	"value" varchar NOT NULL,
  	"css_class" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "forms_blocks_multi_step_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"css_class" varchar
  );
  
  CREATE TABLE "forms_blocks_multi_step_steps_locales" (
  	"label" varchar NOT NULL,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "forms_blocks_multi_step" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  ALTER TABLE "forms_blocks_checkbox" ADD COLUMN "css_class" varchar;
  ALTER TABLE "forms_blocks_checkbox_locales" ADD COLUMN "help_text" varchar;
  ALTER TABLE "forms_blocks_country" ADD COLUMN "css_class" varchar;
  ALTER TABLE "forms_blocks_country_locales" ADD COLUMN "help_text" varchar;
  ALTER TABLE "forms_blocks_email" ADD COLUMN "css_class" varchar;
  ALTER TABLE "forms_blocks_email_locales" ADD COLUMN "help_text" varchar;
  ALTER TABLE "forms_blocks_message" ADD COLUMN "css_class" varchar;
  ALTER TABLE "forms_blocks_number" ADD COLUMN "css_class" varchar;
  ALTER TABLE "forms_blocks_number_locales" ADD COLUMN "help_text" varchar;
  ALTER TABLE "forms_blocks_select" ADD COLUMN "css_class" varchar;
  ALTER TABLE "forms_blocks_select_locales" ADD COLUMN "help_text" varchar;
  ALTER TABLE "forms_blocks_state" ADD COLUMN "css_class" varchar;
  ALTER TABLE "forms_blocks_state_locales" ADD COLUMN "help_text" varchar;
  ALTER TABLE "forms_blocks_text" ADD COLUMN "css_class" varchar;
  ALTER TABLE "forms_blocks_text_locales" ADD COLUMN "help_text" varchar;
  ALTER TABLE "forms_blocks_textarea" ADD COLUMN "css_class" varchar;
  ALTER TABLE "forms_blocks_textarea_locales" ADD COLUMN "help_text" varchar;
  ALTER TABLE "forms_blocks_radio_options" ADD CONSTRAINT "forms_blocks_radio_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms_blocks_radio"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_radio_options_locales" ADD CONSTRAINT "forms_blocks_radio_options_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms_blocks_radio_options"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_radio" ADD CONSTRAINT "forms_blocks_radio_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_radio_locales" ADD CONSTRAINT "forms_blocks_radio_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms_blocks_radio"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_date" ADD CONSTRAINT "forms_blocks_date_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_date_locales" ADD CONSTRAINT "forms_blocks_date_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms_blocks_date"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_file" ADD CONSTRAINT "forms_blocks_file_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_file_locales" ADD CONSTRAINT "forms_blocks_file_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms_blocks_file"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_signature" ADD CONSTRAINT "forms_blocks_signature_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_signature_locales" ADD CONSTRAINT "forms_blocks_signature_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms_blocks_signature"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_phone" ADD CONSTRAINT "forms_blocks_phone_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_phone_locales" ADD CONSTRAINT "forms_blocks_phone_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms_blocks_phone"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_time" ADD CONSTRAINT "forms_blocks_time_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_time_locales" ADD CONSTRAINT "forms_blocks_time_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms_blocks_time"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_rating_labels" ADD CONSTRAINT "forms_blocks_rating_labels_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms_blocks_rating"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_rating_labels_locales" ADD CONSTRAINT "forms_blocks_rating_labels_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms_blocks_rating_labels"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_rating" ADD CONSTRAINT "forms_blocks_rating_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_rating_locales" ADD CONSTRAINT "forms_blocks_rating_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms_blocks_rating"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_scale" ADD CONSTRAINT "forms_blocks_scale_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_scale_locales" ADD CONSTRAINT "forms_blocks_scale_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms_blocks_scale"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_image" ADD CONSTRAINT "forms_blocks_image_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "forms_blocks_image" ADD CONSTRAINT "forms_blocks_image_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_image_locales" ADD CONSTRAINT "forms_blocks_image_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms_blocks_image"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_group" ADD CONSTRAINT "forms_blocks_group_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_group_locales" ADD CONSTRAINT "forms_blocks_group_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms_blocks_group"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_list" ADD CONSTRAINT "forms_blocks_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_list_locales" ADD CONSTRAINT "forms_blocks_list_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms_blocks_list"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_conditional" ADD CONSTRAINT "forms_blocks_conditional_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_multi_step_steps" ADD CONSTRAINT "forms_blocks_multi_step_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms_blocks_multi_step"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_multi_step_steps_locales" ADD CONSTRAINT "forms_blocks_multi_step_steps_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms_blocks_multi_step_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "forms_blocks_multi_step" ADD CONSTRAINT "forms_blocks_multi_step_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "forms_blocks_radio_options_order_idx" ON "forms_blocks_radio_options" USING btree ("_order");
  CREATE INDEX "forms_blocks_radio_options_parent_id_idx" ON "forms_blocks_radio_options" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "forms_blocks_radio_options_locales_locale_parent_id_unique" ON "forms_blocks_radio_options_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "forms_blocks_radio_order_idx" ON "forms_blocks_radio" USING btree ("_order");
  CREATE INDEX "forms_blocks_radio_parent_id_idx" ON "forms_blocks_radio" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_radio_path_idx" ON "forms_blocks_radio" USING btree ("_path");
  CREATE UNIQUE INDEX "forms_blocks_radio_locales_locale_parent_id_unique" ON "forms_blocks_radio_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "forms_blocks_date_order_idx" ON "forms_blocks_date" USING btree ("_order");
  CREATE INDEX "forms_blocks_date_parent_id_idx" ON "forms_blocks_date" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_date_path_idx" ON "forms_blocks_date" USING btree ("_path");
  CREATE UNIQUE INDEX "forms_blocks_date_locales_locale_parent_id_unique" ON "forms_blocks_date_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "forms_blocks_file_order_idx" ON "forms_blocks_file" USING btree ("_order");
  CREATE INDEX "forms_blocks_file_parent_id_idx" ON "forms_blocks_file" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_file_path_idx" ON "forms_blocks_file" USING btree ("_path");
  CREATE UNIQUE INDEX "forms_blocks_file_locales_locale_parent_id_unique" ON "forms_blocks_file_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "forms_blocks_signature_order_idx" ON "forms_blocks_signature" USING btree ("_order");
  CREATE INDEX "forms_blocks_signature_parent_id_idx" ON "forms_blocks_signature" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_signature_path_idx" ON "forms_blocks_signature" USING btree ("_path");
  CREATE UNIQUE INDEX "forms_blocks_signature_locales_locale_parent_id_unique" ON "forms_blocks_signature_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "forms_blocks_phone_order_idx" ON "forms_blocks_phone" USING btree ("_order");
  CREATE INDEX "forms_blocks_phone_parent_id_idx" ON "forms_blocks_phone" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_phone_path_idx" ON "forms_blocks_phone" USING btree ("_path");
  CREATE UNIQUE INDEX "forms_blocks_phone_locales_locale_parent_id_unique" ON "forms_blocks_phone_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "forms_blocks_time_order_idx" ON "forms_blocks_time" USING btree ("_order");
  CREATE INDEX "forms_blocks_time_parent_id_idx" ON "forms_blocks_time" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_time_path_idx" ON "forms_blocks_time" USING btree ("_path");
  CREATE UNIQUE INDEX "forms_blocks_time_locales_locale_parent_id_unique" ON "forms_blocks_time_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "forms_blocks_rating_labels_order_idx" ON "forms_blocks_rating_labels" USING btree ("_order");
  CREATE INDEX "forms_blocks_rating_labels_parent_id_idx" ON "forms_blocks_rating_labels" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "forms_blocks_rating_labels_locales_locale_parent_id_unique" ON "forms_blocks_rating_labels_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "forms_blocks_rating_order_idx" ON "forms_blocks_rating" USING btree ("_order");
  CREATE INDEX "forms_blocks_rating_parent_id_idx" ON "forms_blocks_rating" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_rating_path_idx" ON "forms_blocks_rating" USING btree ("_path");
  CREATE UNIQUE INDEX "forms_blocks_rating_locales_locale_parent_id_unique" ON "forms_blocks_rating_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "forms_blocks_scale_order_idx" ON "forms_blocks_scale" USING btree ("_order");
  CREATE INDEX "forms_blocks_scale_parent_id_idx" ON "forms_blocks_scale" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_scale_path_idx" ON "forms_blocks_scale" USING btree ("_path");
  CREATE UNIQUE INDEX "forms_blocks_scale_locales_locale_parent_id_unique" ON "forms_blocks_scale_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "forms_blocks_image_order_idx" ON "forms_blocks_image" USING btree ("_order");
  CREATE INDEX "forms_blocks_image_parent_id_idx" ON "forms_blocks_image" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_image_path_idx" ON "forms_blocks_image" USING btree ("_path");
  CREATE INDEX "forms_blocks_image_media_idx" ON "forms_blocks_image" USING btree ("media_id");
  CREATE UNIQUE INDEX "forms_blocks_image_locales_locale_parent_id_unique" ON "forms_blocks_image_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "forms_blocks_group_order_idx" ON "forms_blocks_group" USING btree ("_order");
  CREATE INDEX "forms_blocks_group_parent_id_idx" ON "forms_blocks_group" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_group_path_idx" ON "forms_blocks_group" USING btree ("_path");
  CREATE UNIQUE INDEX "forms_blocks_group_locales_locale_parent_id_unique" ON "forms_blocks_group_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "forms_blocks_list_order_idx" ON "forms_blocks_list" USING btree ("_order");
  CREATE INDEX "forms_blocks_list_parent_id_idx" ON "forms_blocks_list" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_list_path_idx" ON "forms_blocks_list" USING btree ("_path");
  CREATE UNIQUE INDEX "forms_blocks_list_locales_locale_parent_id_unique" ON "forms_blocks_list_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "forms_blocks_conditional_order_idx" ON "forms_blocks_conditional" USING btree ("_order");
  CREATE INDEX "forms_blocks_conditional_parent_id_idx" ON "forms_blocks_conditional" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_conditional_path_idx" ON "forms_blocks_conditional" USING btree ("_path");
  CREATE INDEX "forms_blocks_multi_step_steps_order_idx" ON "forms_blocks_multi_step_steps" USING btree ("_order");
  CREATE INDEX "forms_blocks_multi_step_steps_parent_id_idx" ON "forms_blocks_multi_step_steps" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "forms_blocks_multi_step_steps_locales_locale_parent_id_unique" ON "forms_blocks_multi_step_steps_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "forms_blocks_multi_step_order_idx" ON "forms_blocks_multi_step" USING btree ("_order");
  CREATE INDEX "forms_blocks_multi_step_parent_id_idx" ON "forms_blocks_multi_step" USING btree ("_parent_id");
  CREATE INDEX "forms_blocks_multi_step_path_idx" ON "forms_blocks_multi_step" USING btree ("_path");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "forms_blocks_radio_options" CASCADE;
  DROP TABLE "forms_blocks_radio_options_locales" CASCADE;
  DROP TABLE "forms_blocks_radio" CASCADE;
  DROP TABLE "forms_blocks_radio_locales" CASCADE;
  DROP TABLE "forms_blocks_date" CASCADE;
  DROP TABLE "forms_blocks_date_locales" CASCADE;
  DROP TABLE "forms_blocks_file" CASCADE;
  DROP TABLE "forms_blocks_file_locales" CASCADE;
  DROP TABLE "forms_blocks_signature" CASCADE;
  DROP TABLE "forms_blocks_signature_locales" CASCADE;
  DROP TABLE "forms_blocks_phone" CASCADE;
  DROP TABLE "forms_blocks_phone_locales" CASCADE;
  DROP TABLE "forms_blocks_time" CASCADE;
  DROP TABLE "forms_blocks_time_locales" CASCADE;
  DROP TABLE "forms_blocks_rating_labels" CASCADE;
  DROP TABLE "forms_blocks_rating_labels_locales" CASCADE;
  DROP TABLE "forms_blocks_rating" CASCADE;
  DROP TABLE "forms_blocks_rating_locales" CASCADE;
  DROP TABLE "forms_blocks_scale" CASCADE;
  DROP TABLE "forms_blocks_scale_locales" CASCADE;
  DROP TABLE "forms_blocks_image" CASCADE;
  DROP TABLE "forms_blocks_image_locales" CASCADE;
  DROP TABLE "forms_blocks_group" CASCADE;
  DROP TABLE "forms_blocks_group_locales" CASCADE;
  DROP TABLE "forms_blocks_list" CASCADE;
  DROP TABLE "forms_blocks_list_locales" CASCADE;
  DROP TABLE "forms_blocks_conditional" CASCADE;
  DROP TABLE "forms_blocks_multi_step_steps" CASCADE;
  DROP TABLE "forms_blocks_multi_step_steps_locales" CASCADE;
  DROP TABLE "forms_blocks_multi_step" CASCADE;
  ALTER TABLE "forms_blocks_checkbox" DROP COLUMN "css_class";
  ALTER TABLE "forms_blocks_checkbox_locales" DROP COLUMN "help_text";
  ALTER TABLE "forms_blocks_country" DROP COLUMN "css_class";
  ALTER TABLE "forms_blocks_country_locales" DROP COLUMN "help_text";
  ALTER TABLE "forms_blocks_email" DROP COLUMN "css_class";
  ALTER TABLE "forms_blocks_email_locales" DROP COLUMN "help_text";
  ALTER TABLE "forms_blocks_message" DROP COLUMN "css_class";
  ALTER TABLE "forms_blocks_number" DROP COLUMN "css_class";
  ALTER TABLE "forms_blocks_number_locales" DROP COLUMN "help_text";
  ALTER TABLE "forms_blocks_select" DROP COLUMN "css_class";
  ALTER TABLE "forms_blocks_select_locales" DROP COLUMN "help_text";
  ALTER TABLE "forms_blocks_state" DROP COLUMN "css_class";
  ALTER TABLE "forms_blocks_state_locales" DROP COLUMN "help_text";
  ALTER TABLE "forms_blocks_text" DROP COLUMN "css_class";
  ALTER TABLE "forms_blocks_text_locales" DROP COLUMN "help_text";
  ALTER TABLE "forms_blocks_textarea" DROP COLUMN "css_class";
  ALTER TABLE "forms_blocks_textarea_locales" DROP COLUMN "help_text";
  DROP TYPE "public"."enum_forms_blocks_radio_direction";
  DROP TYPE "public"."enum_forms_blocks_rating_display";
  DROP TYPE "public"."enum_forms_blocks_image_size";
  DROP TYPE "public"."enum_forms_blocks_conditional_operator";`)
}

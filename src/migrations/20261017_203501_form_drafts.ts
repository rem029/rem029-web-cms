import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_forms_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__forms_v_version_available_languages" AS ENUM('en', 'ar');
  CREATE TYPE "public"."enum__forms_v_blocks_country_icon" AS ENUM('', 'person', 'email', 'phone', 'message', 'number', 'select', 'checkbox', 'location');
  CREATE TYPE "public"."enum__forms_v_blocks_email_icon" AS ENUM('', 'person', 'email', 'phone', 'message', 'number', 'select', 'checkbox', 'location');
  CREATE TYPE "public"."enum__forms_v_blocks_number_icon" AS ENUM('', 'person', 'email', 'phone', 'message', 'number', 'select', 'checkbox', 'location');
  CREATE TYPE "public"."enum__forms_v_blocks_select_icon" AS ENUM('', 'person', 'email', 'phone', 'message', 'number', 'select', 'checkbox', 'location');
  CREATE TYPE "public"."enum__forms_v_blocks_state_icon" AS ENUM('', 'person', 'email', 'phone', 'message', 'number', 'select', 'checkbox', 'location');
  CREATE TYPE "public"."enum__forms_v_blocks_text_icon" AS ENUM('', 'person', 'email', 'phone', 'message', 'number', 'select', 'checkbox', 'location');
  CREATE TYPE "public"."enum__forms_v_blocks_radio_direction" AS ENUM('column', 'row');
  CREATE TYPE "public"."enum__forms_v_blocks_rating_display" AS ENUM('stars', 'buttons');
  CREATE TYPE "public"."enum__forms_v_blocks_image_size" AS ENUM('small', 'medium', 'full');
  CREATE TYPE "public"."enum__forms_v_blocks_conditional_operator" AS ENUM('equal', 'not_equal', 'contains', 'not_contains');
  CREATE TYPE "public"."enum__forms_v_version_confirmation_type" AS ENUM('message', 'redirect');
  CREATE TYPE "public"."enum__forms_v_version_appearance_width" AS ENUM('narrow', 'medium', 'wide', 'full');
  CREATE TYPE "public"."enum__forms_v_version_appearance_card" AS ENUM('plain', 'card');
  CREATE TYPE "public"."enum__forms_v_version_appearance_density" AS ENUM('comfortable', 'compact');
  CREATE TYPE "public"."enum__forms_v_version_appearance_field_style" AS ENUM('outlined', 'filled', 'underlined');
  CREATE TYPE "public"."enum__forms_v_version_appearance_label_position" AS ENUM('above', 'floating', 'inline');
  CREATE TYPE "public"."enum__forms_v_version_appearance_radius" AS ENUM('none', 'small', 'medium', 'large', 'pill');
  CREATE TYPE "public"."enum__forms_v_version_appearance_button_style" AS ENUM('solid', 'outline');
  CREATE TYPE "public"."enum__forms_v_version_appearance_step_indicator" AS ENUM('progress', 'numbered', 'dots', 'none');
  CREATE TYPE "public"."enum__forms_v_version_appearance_background_overlay" AS ENUM('none', 'light', 'dark');
  CREATE TYPE "public"."enum__forms_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__forms_v_published_locale" AS ENUM('en', 'ar');
  CREATE TABLE "_forms_v_version_available_languages" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum__forms_v_version_available_languages",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "_forms_v_blocks_checkbox" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"width" numeric,
  	"required" boolean,
  	"default_value" boolean,
  	"css_class" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_forms_v_blocks_checkbox_locales" (
  	"label" varchar,
  	"help_text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_forms_v_blocks_country" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"width" numeric,
  	"required" boolean,
  	"css_class" varchar,
  	"icon" "enum__forms_v_blocks_country_icon",
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_forms_v_blocks_country_locales" (
  	"label" varchar,
  	"help_text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_forms_v_blocks_email" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"width" numeric,
  	"required" boolean,
  	"css_class" varchar,
  	"icon" "enum__forms_v_blocks_email_icon",
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_forms_v_blocks_email_locales" (
  	"label" varchar,
  	"help_text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_forms_v_blocks_message" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"css_class" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_forms_v_blocks_message_locales" (
  	"message" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_forms_v_blocks_number" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"width" numeric,
  	"default_value" numeric,
  	"required" boolean,
  	"css_class" varchar,
  	"icon" "enum__forms_v_blocks_number_icon",
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_forms_v_blocks_number_locales" (
  	"label" varchar,
  	"help_text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_forms_v_blocks_select_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_forms_v_blocks_select_options_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_forms_v_blocks_select" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"width" numeric,
  	"placeholder" varchar,
  	"required" boolean,
  	"css_class" varchar,
  	"icon" "enum__forms_v_blocks_select_icon",
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_forms_v_blocks_select_locales" (
  	"label" varchar,
  	"default_value" varchar,
  	"help_text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_forms_v_blocks_state" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"width" numeric,
  	"required" boolean,
  	"css_class" varchar,
  	"icon" "enum__forms_v_blocks_state_icon",
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_forms_v_blocks_state_locales" (
  	"label" varchar,
  	"help_text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_forms_v_blocks_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"width" numeric,
  	"required" boolean,
  	"css_class" varchar,
  	"icon" "enum__forms_v_blocks_text_icon",
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_forms_v_blocks_text_locales" (
  	"label" varchar,
  	"default_value" varchar,
  	"help_text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_forms_v_blocks_textarea" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"width" numeric,
  	"required" boolean,
  	"css_class" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_forms_v_blocks_textarea_locales" (
  	"label" varchar,
  	"default_value" varchar,
  	"help_text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_forms_v_blocks_radio_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_forms_v_blocks_radio_options_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_forms_v_blocks_radio" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"width" numeric,
  	"required" boolean,
  	"css_class" varchar,
  	"direction" "enum__forms_v_blocks_radio_direction" DEFAULT 'column',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_forms_v_blocks_radio_locales" (
  	"label" varchar,
  	"default_value" varchar,
  	"help_text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_forms_v_blocks_date" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"width" numeric,
  	"required" boolean,
  	"default_value" timestamp(3) with time zone,
  	"css_class" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_forms_v_blocks_date_locales" (
  	"label" varchar,
  	"help_text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_forms_v_blocks_file" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"width" numeric,
  	"required" boolean,
  	"css_class" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_forms_v_blocks_file_locales" (
  	"label" varchar,
  	"help_text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_forms_v_blocks_signature" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"width" numeric,
  	"required" boolean,
  	"css_class" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_forms_v_blocks_signature_locales" (
  	"label" varchar,
  	"help_text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_forms_v_blocks_phone" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"width" numeric,
  	"required" boolean,
  	"css_class" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_forms_v_blocks_phone_locales" (
  	"label" varchar,
  	"help_text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_forms_v_blocks_time" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"width" numeric,
  	"required" boolean,
  	"css_class" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_forms_v_blocks_time_locales" (
  	"label" varchar,
  	"help_text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_forms_v_blocks_rating_labels" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_forms_v_blocks_rating_labels_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_forms_v_blocks_rating" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"width" numeric,
  	"required" boolean,
  	"css_class" varchar,
  	"point_count" numeric DEFAULT 5,
  	"display" "enum__forms_v_blocks_rating_display" DEFAULT 'stars',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_forms_v_blocks_rating_locales" (
  	"label" varchar,
  	"help_text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_forms_v_blocks_scale" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"width" numeric,
  	"required" boolean,
  	"css_class" varchar,
  	"min" numeric DEFAULT 0,
  	"max" numeric DEFAULT 10,
  	"step" numeric DEFAULT 1,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_forms_v_blocks_scale_locales" (
  	"label" varchar,
  	"help_text" varchar,
  	"min_label" varchar,
  	"max_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_forms_v_blocks_image" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"media_id" integer,
  	"size" "enum__forms_v_blocks_image_size" DEFAULT 'full',
  	"css_class" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_forms_v_blocks_image_locales" (
  	"caption" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_forms_v_blocks_group" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"width" numeric,
  	"required" boolean,
  	"css_class" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_forms_v_blocks_group_locales" (
  	"label" varchar,
  	"help_text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_forms_v_blocks_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"width" numeric,
  	"required" boolean,
  	"css_class" varchar,
  	"max_items" numeric,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_forms_v_blocks_list_locales" (
  	"label" varchar,
  	"help_text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_forms_v_blocks_conditional" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"condition_field" varchar,
  	"operator" "enum__forms_v_blocks_conditional_operator" DEFAULT 'equal',
  	"value" varchar,
  	"css_class" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_forms_v_blocks_multi_step_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"css_class" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_forms_v_blocks_multi_step_steps_locales" (
  	"label" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_forms_v_blocks_multi_step" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_forms_v_version_emails" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"email_to" varchar,
  	"cc" varchar,
  	"bcc" varchar,
  	"reply_to" varchar,
  	"email_from" varchar,
  	"subject" varchar DEFAULT 'You''ve received a new message.',
  	"message" jsonb,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_forms_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_tenant_id" integer,
  	"version_slug" varchar,
  	"version_slug_lock" boolean DEFAULT true,
  	"version_is_active" boolean DEFAULT true,
  	"version_active_from" timestamp(3) with time zone,
  	"version_active_to" timestamp(3) with time zone,
  	"version_requires_auth" boolean DEFAULT false,
  	"version_show_sequence_number" boolean DEFAULT false,
  	"version_header_image_id" integer,
  	"version_has_terms" boolean DEFAULT false,
  	"version_confirmation_type" "enum__forms_v_version_confirmation_type" DEFAULT 'message',
  	"version_redirect_url" varchar,
  	"version_appearance_width" "enum__forms_v_version_appearance_width" DEFAULT 'medium',
  	"version_appearance_card" "enum__forms_v_version_appearance_card" DEFAULT 'card',
  	"version_appearance_density" "enum__forms_v_version_appearance_density" DEFAULT 'comfortable',
  	"version_appearance_field_style" "enum__forms_v_version_appearance_field_style" DEFAULT 'outlined',
  	"version_appearance_label_position" "enum__forms_v_version_appearance_label_position" DEFAULT 'above',
  	"version_appearance_radius" "enum__forms_v_version_appearance_radius" DEFAULT 'medium',
  	"version_appearance_button_style" "enum__forms_v_version_appearance_button_style" DEFAULT 'solid',
  	"version_appearance_button_full_width" boolean DEFAULT false,
  	"version_appearance_step_indicator" "enum__forms_v_version_appearance_step_indicator" DEFAULT 'progress',
  	"version_appearance_accent_color" varchar,
  	"version_appearance_background_image_id" integer,
  	"version_appearance_background_overlay" "enum__forms_v_version_appearance_background_overlay" DEFAULT 'none',
  	"version_custom_css" varchar,
  	"version_created_by_id" integer,
  	"version_updated_by_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__forms_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__forms_v_published_locale",
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_forms_v_locales" (
  	"version_title" varchar,
  	"version_terms_content" jsonb,
  	"version_submit_button_label" varchar,
  	"version_confirmation_message" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "forms_blocks_checkbox" ALTER COLUMN "name" DROP NOT NULL;
  ALTER TABLE "forms_blocks_country" ALTER COLUMN "name" DROP NOT NULL;
  ALTER TABLE "forms_blocks_email" ALTER COLUMN "name" DROP NOT NULL;
  ALTER TABLE "forms_blocks_number" ALTER COLUMN "name" DROP NOT NULL;
  ALTER TABLE "forms_blocks_select_options" ALTER COLUMN "value" DROP NOT NULL;
  ALTER TABLE "forms_blocks_select_options_locales" ALTER COLUMN "label" DROP NOT NULL;
  ALTER TABLE "forms_blocks_select" ALTER COLUMN "name" DROP NOT NULL;
  ALTER TABLE "forms_blocks_state" ALTER COLUMN "name" DROP NOT NULL;
  ALTER TABLE "forms_blocks_text" ALTER COLUMN "name" DROP NOT NULL;
  ALTER TABLE "forms_blocks_textarea" ALTER COLUMN "name" DROP NOT NULL;
  ALTER TABLE "forms_blocks_radio_options" ALTER COLUMN "value" DROP NOT NULL;
  ALTER TABLE "forms_blocks_radio_options_locales" ALTER COLUMN "label" DROP NOT NULL;
  ALTER TABLE "forms_blocks_radio" ALTER COLUMN "name" DROP NOT NULL;
  ALTER TABLE "forms_blocks_date" ALTER COLUMN "name" DROP NOT NULL;
  ALTER TABLE "forms_blocks_file" ALTER COLUMN "name" DROP NOT NULL;
  ALTER TABLE "forms_blocks_signature" ALTER COLUMN "name" DROP NOT NULL;
  ALTER TABLE "forms_blocks_phone" ALTER COLUMN "name" DROP NOT NULL;
  ALTER TABLE "forms_blocks_time" ALTER COLUMN "name" DROP NOT NULL;
  ALTER TABLE "forms_blocks_rating_labels_locales" ALTER COLUMN "label" DROP NOT NULL;
  ALTER TABLE "forms_blocks_rating" ALTER COLUMN "name" DROP NOT NULL;
  ALTER TABLE "forms_blocks_scale" ALTER COLUMN "name" DROP NOT NULL;
  ALTER TABLE "forms_blocks_image" ALTER COLUMN "media_id" DROP NOT NULL;
  ALTER TABLE "forms_blocks_group" ALTER COLUMN "name" DROP NOT NULL;
  ALTER TABLE "forms_blocks_list" ALTER COLUMN "name" DROP NOT NULL;
  ALTER TABLE "forms_blocks_conditional" ALTER COLUMN "condition_field" DROP NOT NULL;
  ALTER TABLE "forms_blocks_conditional" ALTER COLUMN "operator" DROP NOT NULL;
  ALTER TABLE "forms_blocks_conditional" ALTER COLUMN "value" DROP NOT NULL;
  ALTER TABLE "forms_blocks_multi_step_steps_locales" ALTER COLUMN "label" DROP NOT NULL;
  ALTER TABLE "forms_emails" ALTER COLUMN "subject" DROP NOT NULL;
  ALTER TABLE "forms_locales" ALTER COLUMN "title" DROP NOT NULL;
  ALTER TABLE "forms" ADD COLUMN "_status" "enum_forms_status" DEFAULT 'draft';
  -- forms existed before drafts and were all live: keep them published (the new column's default
  -- is 'draft', which would hide every form from the public)
  UPDATE "forms" SET "_status" = 'published' WHERE "_status" = 'draft';
  ALTER TABLE "_forms_v_version_available_languages" ADD CONSTRAINT "_forms_v_version_available_languages_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_forms_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_forms_v_blocks_checkbox" ADD CONSTRAINT "_forms_v_blocks_checkbox_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_forms_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_forms_v_blocks_checkbox_locales" ADD CONSTRAINT "_forms_v_blocks_checkbox_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_forms_v_blocks_checkbox"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_forms_v_blocks_country" ADD CONSTRAINT "_forms_v_blocks_country_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_forms_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_forms_v_blocks_country_locales" ADD CONSTRAINT "_forms_v_blocks_country_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_forms_v_blocks_country"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_forms_v_blocks_email" ADD CONSTRAINT "_forms_v_blocks_email_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_forms_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_forms_v_blocks_email_locales" ADD CONSTRAINT "_forms_v_blocks_email_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_forms_v_blocks_email"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_forms_v_blocks_message" ADD CONSTRAINT "_forms_v_blocks_message_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_forms_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_forms_v_blocks_message_locales" ADD CONSTRAINT "_forms_v_blocks_message_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_forms_v_blocks_message"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_forms_v_blocks_number" ADD CONSTRAINT "_forms_v_blocks_number_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_forms_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_forms_v_blocks_number_locales" ADD CONSTRAINT "_forms_v_blocks_number_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_forms_v_blocks_number"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_forms_v_blocks_select_options" ADD CONSTRAINT "_forms_v_blocks_select_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_forms_v_blocks_select"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_forms_v_blocks_select_options_locales" ADD CONSTRAINT "_forms_v_blocks_select_options_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_forms_v_blocks_select_options"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_forms_v_blocks_select" ADD CONSTRAINT "_forms_v_blocks_select_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_forms_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_forms_v_blocks_select_locales" ADD CONSTRAINT "_forms_v_blocks_select_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_forms_v_blocks_select"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_forms_v_blocks_state" ADD CONSTRAINT "_forms_v_blocks_state_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_forms_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_forms_v_blocks_state_locales" ADD CONSTRAINT "_forms_v_blocks_state_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_forms_v_blocks_state"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_forms_v_blocks_text" ADD CONSTRAINT "_forms_v_blocks_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_forms_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_forms_v_blocks_text_locales" ADD CONSTRAINT "_forms_v_blocks_text_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_forms_v_blocks_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_forms_v_blocks_textarea" ADD CONSTRAINT "_forms_v_blocks_textarea_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_forms_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_forms_v_blocks_textarea_locales" ADD CONSTRAINT "_forms_v_blocks_textarea_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_forms_v_blocks_textarea"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_forms_v_blocks_radio_options" ADD CONSTRAINT "_forms_v_blocks_radio_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_forms_v_blocks_radio"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_forms_v_blocks_radio_options_locales" ADD CONSTRAINT "_forms_v_blocks_radio_options_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_forms_v_blocks_radio_options"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_forms_v_blocks_radio" ADD CONSTRAINT "_forms_v_blocks_radio_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_forms_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_forms_v_blocks_radio_locales" ADD CONSTRAINT "_forms_v_blocks_radio_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_forms_v_blocks_radio"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_forms_v_blocks_date" ADD CONSTRAINT "_forms_v_blocks_date_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_forms_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_forms_v_blocks_date_locales" ADD CONSTRAINT "_forms_v_blocks_date_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_forms_v_blocks_date"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_forms_v_blocks_file" ADD CONSTRAINT "_forms_v_blocks_file_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_forms_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_forms_v_blocks_file_locales" ADD CONSTRAINT "_forms_v_blocks_file_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_forms_v_blocks_file"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_forms_v_blocks_signature" ADD CONSTRAINT "_forms_v_blocks_signature_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_forms_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_forms_v_blocks_signature_locales" ADD CONSTRAINT "_forms_v_blocks_signature_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_forms_v_blocks_signature"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_forms_v_blocks_phone" ADD CONSTRAINT "_forms_v_blocks_phone_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_forms_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_forms_v_blocks_phone_locales" ADD CONSTRAINT "_forms_v_blocks_phone_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_forms_v_blocks_phone"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_forms_v_blocks_time" ADD CONSTRAINT "_forms_v_blocks_time_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_forms_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_forms_v_blocks_time_locales" ADD CONSTRAINT "_forms_v_blocks_time_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_forms_v_blocks_time"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_forms_v_blocks_rating_labels" ADD CONSTRAINT "_forms_v_blocks_rating_labels_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_forms_v_blocks_rating"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_forms_v_blocks_rating_labels_locales" ADD CONSTRAINT "_forms_v_blocks_rating_labels_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_forms_v_blocks_rating_labels"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_forms_v_blocks_rating" ADD CONSTRAINT "_forms_v_blocks_rating_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_forms_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_forms_v_blocks_rating_locales" ADD CONSTRAINT "_forms_v_blocks_rating_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_forms_v_blocks_rating"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_forms_v_blocks_scale" ADD CONSTRAINT "_forms_v_blocks_scale_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_forms_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_forms_v_blocks_scale_locales" ADD CONSTRAINT "_forms_v_blocks_scale_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_forms_v_blocks_scale"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_forms_v_blocks_image" ADD CONSTRAINT "_forms_v_blocks_image_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_forms_v_blocks_image" ADD CONSTRAINT "_forms_v_blocks_image_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_forms_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_forms_v_blocks_image_locales" ADD CONSTRAINT "_forms_v_blocks_image_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_forms_v_blocks_image"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_forms_v_blocks_group" ADD CONSTRAINT "_forms_v_blocks_group_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_forms_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_forms_v_blocks_group_locales" ADD CONSTRAINT "_forms_v_blocks_group_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_forms_v_blocks_group"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_forms_v_blocks_list" ADD CONSTRAINT "_forms_v_blocks_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_forms_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_forms_v_blocks_list_locales" ADD CONSTRAINT "_forms_v_blocks_list_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_forms_v_blocks_list"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_forms_v_blocks_conditional" ADD CONSTRAINT "_forms_v_blocks_conditional_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_forms_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_forms_v_blocks_multi_step_steps" ADD CONSTRAINT "_forms_v_blocks_multi_step_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_forms_v_blocks_multi_step"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_forms_v_blocks_multi_step_steps_locales" ADD CONSTRAINT "_forms_v_blocks_multi_step_steps_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_forms_v_blocks_multi_step_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_forms_v_blocks_multi_step" ADD CONSTRAINT "_forms_v_blocks_multi_step_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_forms_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_forms_v_version_emails" ADD CONSTRAINT "_forms_v_version_emails_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_forms_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_forms_v" ADD CONSTRAINT "_forms_v_parent_id_forms_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."forms"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_forms_v" ADD CONSTRAINT "_forms_v_version_tenant_id_tenants_id_fk" FOREIGN KEY ("version_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_forms_v" ADD CONSTRAINT "_forms_v_version_header_image_id_media_id_fk" FOREIGN KEY ("version_header_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_forms_v" ADD CONSTRAINT "_forms_v_version_appearance_background_image_id_media_id_fk" FOREIGN KEY ("version_appearance_background_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_forms_v" ADD CONSTRAINT "_forms_v_version_created_by_id_users_id_fk" FOREIGN KEY ("version_created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_forms_v" ADD CONSTRAINT "_forms_v_version_updated_by_id_users_id_fk" FOREIGN KEY ("version_updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_forms_v_locales" ADD CONSTRAINT "_forms_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_forms_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "_forms_v_version_available_languages_order_idx" ON "_forms_v_version_available_languages" USING btree ("order");
  CREATE INDEX "_forms_v_version_available_languages_parent_idx" ON "_forms_v_version_available_languages" USING btree ("parent_id");
  CREATE INDEX "_forms_v_blocks_checkbox_order_idx" ON "_forms_v_blocks_checkbox" USING btree ("_order");
  CREATE INDEX "_forms_v_blocks_checkbox_parent_id_idx" ON "_forms_v_blocks_checkbox" USING btree ("_parent_id");
  CREATE INDEX "_forms_v_blocks_checkbox_path_idx" ON "_forms_v_blocks_checkbox" USING btree ("_path");
  CREATE UNIQUE INDEX "_forms_v_blocks_checkbox_locales_locale_parent_id_unique" ON "_forms_v_blocks_checkbox_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_forms_v_blocks_country_order_idx" ON "_forms_v_blocks_country" USING btree ("_order");
  CREATE INDEX "_forms_v_blocks_country_parent_id_idx" ON "_forms_v_blocks_country" USING btree ("_parent_id");
  CREATE INDEX "_forms_v_blocks_country_path_idx" ON "_forms_v_blocks_country" USING btree ("_path");
  CREATE UNIQUE INDEX "_forms_v_blocks_country_locales_locale_parent_id_unique" ON "_forms_v_blocks_country_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_forms_v_blocks_email_order_idx" ON "_forms_v_blocks_email" USING btree ("_order");
  CREATE INDEX "_forms_v_blocks_email_parent_id_idx" ON "_forms_v_blocks_email" USING btree ("_parent_id");
  CREATE INDEX "_forms_v_blocks_email_path_idx" ON "_forms_v_blocks_email" USING btree ("_path");
  CREATE UNIQUE INDEX "_forms_v_blocks_email_locales_locale_parent_id_unique" ON "_forms_v_blocks_email_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_forms_v_blocks_message_order_idx" ON "_forms_v_blocks_message" USING btree ("_order");
  CREATE INDEX "_forms_v_blocks_message_parent_id_idx" ON "_forms_v_blocks_message" USING btree ("_parent_id");
  CREATE INDEX "_forms_v_blocks_message_path_idx" ON "_forms_v_blocks_message" USING btree ("_path");
  CREATE UNIQUE INDEX "_forms_v_blocks_message_locales_locale_parent_id_unique" ON "_forms_v_blocks_message_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_forms_v_blocks_number_order_idx" ON "_forms_v_blocks_number" USING btree ("_order");
  CREATE INDEX "_forms_v_blocks_number_parent_id_idx" ON "_forms_v_blocks_number" USING btree ("_parent_id");
  CREATE INDEX "_forms_v_blocks_number_path_idx" ON "_forms_v_blocks_number" USING btree ("_path");
  CREATE UNIQUE INDEX "_forms_v_blocks_number_locales_locale_parent_id_unique" ON "_forms_v_blocks_number_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_forms_v_blocks_select_options_order_idx" ON "_forms_v_blocks_select_options" USING btree ("_order");
  CREATE INDEX "_forms_v_blocks_select_options_parent_id_idx" ON "_forms_v_blocks_select_options" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_forms_v_blocks_select_options_locales_locale_parent_id_unique" ON "_forms_v_blocks_select_options_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_forms_v_blocks_select_order_idx" ON "_forms_v_blocks_select" USING btree ("_order");
  CREATE INDEX "_forms_v_blocks_select_parent_id_idx" ON "_forms_v_blocks_select" USING btree ("_parent_id");
  CREATE INDEX "_forms_v_blocks_select_path_idx" ON "_forms_v_blocks_select" USING btree ("_path");
  CREATE UNIQUE INDEX "_forms_v_blocks_select_locales_locale_parent_id_unique" ON "_forms_v_blocks_select_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_forms_v_blocks_state_order_idx" ON "_forms_v_blocks_state" USING btree ("_order");
  CREATE INDEX "_forms_v_blocks_state_parent_id_idx" ON "_forms_v_blocks_state" USING btree ("_parent_id");
  CREATE INDEX "_forms_v_blocks_state_path_idx" ON "_forms_v_blocks_state" USING btree ("_path");
  CREATE UNIQUE INDEX "_forms_v_blocks_state_locales_locale_parent_id_unique" ON "_forms_v_blocks_state_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_forms_v_blocks_text_order_idx" ON "_forms_v_blocks_text" USING btree ("_order");
  CREATE INDEX "_forms_v_blocks_text_parent_id_idx" ON "_forms_v_blocks_text" USING btree ("_parent_id");
  CREATE INDEX "_forms_v_blocks_text_path_idx" ON "_forms_v_blocks_text" USING btree ("_path");
  CREATE UNIQUE INDEX "_forms_v_blocks_text_locales_locale_parent_id_unique" ON "_forms_v_blocks_text_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_forms_v_blocks_textarea_order_idx" ON "_forms_v_blocks_textarea" USING btree ("_order");
  CREATE INDEX "_forms_v_blocks_textarea_parent_id_idx" ON "_forms_v_blocks_textarea" USING btree ("_parent_id");
  CREATE INDEX "_forms_v_blocks_textarea_path_idx" ON "_forms_v_blocks_textarea" USING btree ("_path");
  CREATE UNIQUE INDEX "_forms_v_blocks_textarea_locales_locale_parent_id_unique" ON "_forms_v_blocks_textarea_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_forms_v_blocks_radio_options_order_idx" ON "_forms_v_blocks_radio_options" USING btree ("_order");
  CREATE INDEX "_forms_v_blocks_radio_options_parent_id_idx" ON "_forms_v_blocks_radio_options" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_forms_v_blocks_radio_options_locales_locale_parent_id_unique" ON "_forms_v_blocks_radio_options_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_forms_v_blocks_radio_order_idx" ON "_forms_v_blocks_radio" USING btree ("_order");
  CREATE INDEX "_forms_v_blocks_radio_parent_id_idx" ON "_forms_v_blocks_radio" USING btree ("_parent_id");
  CREATE INDEX "_forms_v_blocks_radio_path_idx" ON "_forms_v_blocks_radio" USING btree ("_path");
  CREATE UNIQUE INDEX "_forms_v_blocks_radio_locales_locale_parent_id_unique" ON "_forms_v_blocks_radio_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_forms_v_blocks_date_order_idx" ON "_forms_v_blocks_date" USING btree ("_order");
  CREATE INDEX "_forms_v_blocks_date_parent_id_idx" ON "_forms_v_blocks_date" USING btree ("_parent_id");
  CREATE INDEX "_forms_v_blocks_date_path_idx" ON "_forms_v_blocks_date" USING btree ("_path");
  CREATE UNIQUE INDEX "_forms_v_blocks_date_locales_locale_parent_id_unique" ON "_forms_v_blocks_date_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_forms_v_blocks_file_order_idx" ON "_forms_v_blocks_file" USING btree ("_order");
  CREATE INDEX "_forms_v_blocks_file_parent_id_idx" ON "_forms_v_blocks_file" USING btree ("_parent_id");
  CREATE INDEX "_forms_v_blocks_file_path_idx" ON "_forms_v_blocks_file" USING btree ("_path");
  CREATE UNIQUE INDEX "_forms_v_blocks_file_locales_locale_parent_id_unique" ON "_forms_v_blocks_file_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_forms_v_blocks_signature_order_idx" ON "_forms_v_blocks_signature" USING btree ("_order");
  CREATE INDEX "_forms_v_blocks_signature_parent_id_idx" ON "_forms_v_blocks_signature" USING btree ("_parent_id");
  CREATE INDEX "_forms_v_blocks_signature_path_idx" ON "_forms_v_blocks_signature" USING btree ("_path");
  CREATE UNIQUE INDEX "_forms_v_blocks_signature_locales_locale_parent_id_unique" ON "_forms_v_blocks_signature_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_forms_v_blocks_phone_order_idx" ON "_forms_v_blocks_phone" USING btree ("_order");
  CREATE INDEX "_forms_v_blocks_phone_parent_id_idx" ON "_forms_v_blocks_phone" USING btree ("_parent_id");
  CREATE INDEX "_forms_v_blocks_phone_path_idx" ON "_forms_v_blocks_phone" USING btree ("_path");
  CREATE UNIQUE INDEX "_forms_v_blocks_phone_locales_locale_parent_id_unique" ON "_forms_v_blocks_phone_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_forms_v_blocks_time_order_idx" ON "_forms_v_blocks_time" USING btree ("_order");
  CREATE INDEX "_forms_v_blocks_time_parent_id_idx" ON "_forms_v_blocks_time" USING btree ("_parent_id");
  CREATE INDEX "_forms_v_blocks_time_path_idx" ON "_forms_v_blocks_time" USING btree ("_path");
  CREATE UNIQUE INDEX "_forms_v_blocks_time_locales_locale_parent_id_unique" ON "_forms_v_blocks_time_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_forms_v_blocks_rating_labels_order_idx" ON "_forms_v_blocks_rating_labels" USING btree ("_order");
  CREATE INDEX "_forms_v_blocks_rating_labels_parent_id_idx" ON "_forms_v_blocks_rating_labels" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_forms_v_blocks_rating_labels_locales_locale_parent_id_unique" ON "_forms_v_blocks_rating_labels_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_forms_v_blocks_rating_order_idx" ON "_forms_v_blocks_rating" USING btree ("_order");
  CREATE INDEX "_forms_v_blocks_rating_parent_id_idx" ON "_forms_v_blocks_rating" USING btree ("_parent_id");
  CREATE INDEX "_forms_v_blocks_rating_path_idx" ON "_forms_v_blocks_rating" USING btree ("_path");
  CREATE UNIQUE INDEX "_forms_v_blocks_rating_locales_locale_parent_id_unique" ON "_forms_v_blocks_rating_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_forms_v_blocks_scale_order_idx" ON "_forms_v_blocks_scale" USING btree ("_order");
  CREATE INDEX "_forms_v_blocks_scale_parent_id_idx" ON "_forms_v_blocks_scale" USING btree ("_parent_id");
  CREATE INDEX "_forms_v_blocks_scale_path_idx" ON "_forms_v_blocks_scale" USING btree ("_path");
  CREATE UNIQUE INDEX "_forms_v_blocks_scale_locales_locale_parent_id_unique" ON "_forms_v_blocks_scale_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_forms_v_blocks_image_order_idx" ON "_forms_v_blocks_image" USING btree ("_order");
  CREATE INDEX "_forms_v_blocks_image_parent_id_idx" ON "_forms_v_blocks_image" USING btree ("_parent_id");
  CREATE INDEX "_forms_v_blocks_image_path_idx" ON "_forms_v_blocks_image" USING btree ("_path");
  CREATE INDEX "_forms_v_blocks_image_media_idx" ON "_forms_v_blocks_image" USING btree ("media_id");
  CREATE UNIQUE INDEX "_forms_v_blocks_image_locales_locale_parent_id_unique" ON "_forms_v_blocks_image_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_forms_v_blocks_group_order_idx" ON "_forms_v_blocks_group" USING btree ("_order");
  CREATE INDEX "_forms_v_blocks_group_parent_id_idx" ON "_forms_v_blocks_group" USING btree ("_parent_id");
  CREATE INDEX "_forms_v_blocks_group_path_idx" ON "_forms_v_blocks_group" USING btree ("_path");
  CREATE UNIQUE INDEX "_forms_v_blocks_group_locales_locale_parent_id_unique" ON "_forms_v_blocks_group_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_forms_v_blocks_list_order_idx" ON "_forms_v_blocks_list" USING btree ("_order");
  CREATE INDEX "_forms_v_blocks_list_parent_id_idx" ON "_forms_v_blocks_list" USING btree ("_parent_id");
  CREATE INDEX "_forms_v_blocks_list_path_idx" ON "_forms_v_blocks_list" USING btree ("_path");
  CREATE UNIQUE INDEX "_forms_v_blocks_list_locales_locale_parent_id_unique" ON "_forms_v_blocks_list_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_forms_v_blocks_conditional_order_idx" ON "_forms_v_blocks_conditional" USING btree ("_order");
  CREATE INDEX "_forms_v_blocks_conditional_parent_id_idx" ON "_forms_v_blocks_conditional" USING btree ("_parent_id");
  CREATE INDEX "_forms_v_blocks_conditional_path_idx" ON "_forms_v_blocks_conditional" USING btree ("_path");
  CREATE INDEX "_forms_v_blocks_multi_step_steps_order_idx" ON "_forms_v_blocks_multi_step_steps" USING btree ("_order");
  CREATE INDEX "_forms_v_blocks_multi_step_steps_parent_id_idx" ON "_forms_v_blocks_multi_step_steps" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_forms_v_blocks_multi_step_steps_locales_locale_parent_id_unique" ON "_forms_v_blocks_multi_step_steps_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_forms_v_blocks_multi_step_order_idx" ON "_forms_v_blocks_multi_step" USING btree ("_order");
  CREATE INDEX "_forms_v_blocks_multi_step_parent_id_idx" ON "_forms_v_blocks_multi_step" USING btree ("_parent_id");
  CREATE INDEX "_forms_v_blocks_multi_step_path_idx" ON "_forms_v_blocks_multi_step" USING btree ("_path");
  CREATE INDEX "_forms_v_version_emails_order_idx" ON "_forms_v_version_emails" USING btree ("_order");
  CREATE INDEX "_forms_v_version_emails_parent_id_idx" ON "_forms_v_version_emails" USING btree ("_parent_id");
  CREATE INDEX "_forms_v_parent_idx" ON "_forms_v" USING btree ("parent_id");
  CREATE INDEX "_forms_v_version_version_tenant_idx" ON "_forms_v" USING btree ("version_tenant_id");
  CREATE INDEX "_forms_v_version_version_slug_idx" ON "_forms_v" USING btree ("version_slug");
  CREATE INDEX "_forms_v_version_version_header_image_idx" ON "_forms_v" USING btree ("version_header_image_id");
  CREATE INDEX "_forms_v_version_appearance_version_appearance_background_image_idx" ON "_forms_v" USING btree ("version_appearance_background_image_id");
  CREATE INDEX "_forms_v_version_version_created_by_idx" ON "_forms_v" USING btree ("version_created_by_id");
  CREATE INDEX "_forms_v_version_version_updated_by_idx" ON "_forms_v" USING btree ("version_updated_by_id");
  CREATE INDEX "_forms_v_version_version_updated_at_idx" ON "_forms_v" USING btree ("version_updated_at");
  CREATE INDEX "_forms_v_version_version_created_at_idx" ON "_forms_v" USING btree ("version_created_at");
  CREATE INDEX "_forms_v_version_version__status_idx" ON "_forms_v" USING btree ("version__status");
  CREATE INDEX "_forms_v_created_at_idx" ON "_forms_v" USING btree ("created_at");
  CREATE INDEX "_forms_v_updated_at_idx" ON "_forms_v" USING btree ("updated_at");
  CREATE INDEX "_forms_v_snapshot_idx" ON "_forms_v" USING btree ("snapshot");
  CREATE INDEX "_forms_v_published_locale_idx" ON "_forms_v" USING btree ("published_locale");
  CREATE INDEX "_forms_v_latest_idx" ON "_forms_v" USING btree ("latest");
  CREATE INDEX "_forms_v_autosave_idx" ON "_forms_v" USING btree ("autosave");
  CREATE INDEX "version_tenant_version_slug_2_idx" ON "_forms_v" USING btree ("version_tenant_id","version_slug");
  CREATE UNIQUE INDEX "_forms_v_locales_locale_parent_id_unique" ON "_forms_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "forms__status_idx" ON "forms" USING btree ("_status");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "_forms_v_version_available_languages" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_forms_v_blocks_checkbox" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_forms_v_blocks_checkbox_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_forms_v_blocks_country" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_forms_v_blocks_country_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_forms_v_blocks_email" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_forms_v_blocks_email_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_forms_v_blocks_message" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_forms_v_blocks_message_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_forms_v_blocks_number" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_forms_v_blocks_number_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_forms_v_blocks_select_options" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_forms_v_blocks_select_options_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_forms_v_blocks_select" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_forms_v_blocks_select_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_forms_v_blocks_state" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_forms_v_blocks_state_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_forms_v_blocks_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_forms_v_blocks_text_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_forms_v_blocks_textarea" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_forms_v_blocks_textarea_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_forms_v_blocks_radio_options" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_forms_v_blocks_radio_options_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_forms_v_blocks_radio" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_forms_v_blocks_radio_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_forms_v_blocks_date" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_forms_v_blocks_date_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_forms_v_blocks_file" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_forms_v_blocks_file_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_forms_v_blocks_signature" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_forms_v_blocks_signature_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_forms_v_blocks_phone" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_forms_v_blocks_phone_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_forms_v_blocks_time" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_forms_v_blocks_time_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_forms_v_blocks_rating_labels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_forms_v_blocks_rating_labels_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_forms_v_blocks_rating" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_forms_v_blocks_rating_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_forms_v_blocks_scale" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_forms_v_blocks_scale_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_forms_v_blocks_image" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_forms_v_blocks_image_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_forms_v_blocks_group" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_forms_v_blocks_group_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_forms_v_blocks_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_forms_v_blocks_list_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_forms_v_blocks_conditional" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_forms_v_blocks_multi_step_steps" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_forms_v_blocks_multi_step_steps_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_forms_v_blocks_multi_step" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_forms_v_version_emails" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_forms_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_forms_v_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "_forms_v_version_available_languages" CASCADE;
  DROP TABLE "_forms_v_blocks_checkbox" CASCADE;
  DROP TABLE "_forms_v_blocks_checkbox_locales" CASCADE;
  DROP TABLE "_forms_v_blocks_country" CASCADE;
  DROP TABLE "_forms_v_blocks_country_locales" CASCADE;
  DROP TABLE "_forms_v_blocks_email" CASCADE;
  DROP TABLE "_forms_v_blocks_email_locales" CASCADE;
  DROP TABLE "_forms_v_blocks_message" CASCADE;
  DROP TABLE "_forms_v_blocks_message_locales" CASCADE;
  DROP TABLE "_forms_v_blocks_number" CASCADE;
  DROP TABLE "_forms_v_blocks_number_locales" CASCADE;
  DROP TABLE "_forms_v_blocks_select_options" CASCADE;
  DROP TABLE "_forms_v_blocks_select_options_locales" CASCADE;
  DROP TABLE "_forms_v_blocks_select" CASCADE;
  DROP TABLE "_forms_v_blocks_select_locales" CASCADE;
  DROP TABLE "_forms_v_blocks_state" CASCADE;
  DROP TABLE "_forms_v_blocks_state_locales" CASCADE;
  DROP TABLE "_forms_v_blocks_text" CASCADE;
  DROP TABLE "_forms_v_blocks_text_locales" CASCADE;
  DROP TABLE "_forms_v_blocks_textarea" CASCADE;
  DROP TABLE "_forms_v_blocks_textarea_locales" CASCADE;
  DROP TABLE "_forms_v_blocks_radio_options" CASCADE;
  DROP TABLE "_forms_v_blocks_radio_options_locales" CASCADE;
  DROP TABLE "_forms_v_blocks_radio" CASCADE;
  DROP TABLE "_forms_v_blocks_radio_locales" CASCADE;
  DROP TABLE "_forms_v_blocks_date" CASCADE;
  DROP TABLE "_forms_v_blocks_date_locales" CASCADE;
  DROP TABLE "_forms_v_blocks_file" CASCADE;
  DROP TABLE "_forms_v_blocks_file_locales" CASCADE;
  DROP TABLE "_forms_v_blocks_signature" CASCADE;
  DROP TABLE "_forms_v_blocks_signature_locales" CASCADE;
  DROP TABLE "_forms_v_blocks_phone" CASCADE;
  DROP TABLE "_forms_v_blocks_phone_locales" CASCADE;
  DROP TABLE "_forms_v_blocks_time" CASCADE;
  DROP TABLE "_forms_v_blocks_time_locales" CASCADE;
  DROP TABLE "_forms_v_blocks_rating_labels" CASCADE;
  DROP TABLE "_forms_v_blocks_rating_labels_locales" CASCADE;
  DROP TABLE "_forms_v_blocks_rating" CASCADE;
  DROP TABLE "_forms_v_blocks_rating_locales" CASCADE;
  DROP TABLE "_forms_v_blocks_scale" CASCADE;
  DROP TABLE "_forms_v_blocks_scale_locales" CASCADE;
  DROP TABLE "_forms_v_blocks_image" CASCADE;
  DROP TABLE "_forms_v_blocks_image_locales" CASCADE;
  DROP TABLE "_forms_v_blocks_group" CASCADE;
  DROP TABLE "_forms_v_blocks_group_locales" CASCADE;
  DROP TABLE "_forms_v_blocks_list" CASCADE;
  DROP TABLE "_forms_v_blocks_list_locales" CASCADE;
  DROP TABLE "_forms_v_blocks_conditional" CASCADE;
  DROP TABLE "_forms_v_blocks_multi_step_steps" CASCADE;
  DROP TABLE "_forms_v_blocks_multi_step_steps_locales" CASCADE;
  DROP TABLE "_forms_v_blocks_multi_step" CASCADE;
  DROP TABLE "_forms_v_version_emails" CASCADE;
  DROP TABLE "_forms_v" CASCADE;
  DROP TABLE "_forms_v_locales" CASCADE;
  DROP INDEX "forms__status_idx";
  ALTER TABLE "forms_blocks_checkbox" ALTER COLUMN "name" SET NOT NULL;
  ALTER TABLE "forms_blocks_country" ALTER COLUMN "name" SET NOT NULL;
  ALTER TABLE "forms_blocks_email" ALTER COLUMN "name" SET NOT NULL;
  ALTER TABLE "forms_blocks_number" ALTER COLUMN "name" SET NOT NULL;
  ALTER TABLE "forms_blocks_select_options" ALTER COLUMN "value" SET NOT NULL;
  ALTER TABLE "forms_blocks_select_options_locales" ALTER COLUMN "label" SET NOT NULL;
  ALTER TABLE "forms_blocks_select" ALTER COLUMN "name" SET NOT NULL;
  ALTER TABLE "forms_blocks_state" ALTER COLUMN "name" SET NOT NULL;
  ALTER TABLE "forms_blocks_text" ALTER COLUMN "name" SET NOT NULL;
  ALTER TABLE "forms_blocks_textarea" ALTER COLUMN "name" SET NOT NULL;
  ALTER TABLE "forms_blocks_radio_options" ALTER COLUMN "value" SET NOT NULL;
  ALTER TABLE "forms_blocks_radio_options_locales" ALTER COLUMN "label" SET NOT NULL;
  ALTER TABLE "forms_blocks_radio" ALTER COLUMN "name" SET NOT NULL;
  ALTER TABLE "forms_blocks_date" ALTER COLUMN "name" SET NOT NULL;
  ALTER TABLE "forms_blocks_file" ALTER COLUMN "name" SET NOT NULL;
  ALTER TABLE "forms_blocks_signature" ALTER COLUMN "name" SET NOT NULL;
  ALTER TABLE "forms_blocks_phone" ALTER COLUMN "name" SET NOT NULL;
  ALTER TABLE "forms_blocks_time" ALTER COLUMN "name" SET NOT NULL;
  ALTER TABLE "forms_blocks_rating_labels_locales" ALTER COLUMN "label" SET NOT NULL;
  ALTER TABLE "forms_blocks_rating" ALTER COLUMN "name" SET NOT NULL;
  ALTER TABLE "forms_blocks_scale" ALTER COLUMN "name" SET NOT NULL;
  ALTER TABLE "forms_blocks_image" ALTER COLUMN "media_id" SET NOT NULL;
  ALTER TABLE "forms_blocks_group" ALTER COLUMN "name" SET NOT NULL;
  ALTER TABLE "forms_blocks_list" ALTER COLUMN "name" SET NOT NULL;
  ALTER TABLE "forms_blocks_conditional" ALTER COLUMN "condition_field" SET NOT NULL;
  ALTER TABLE "forms_blocks_conditional" ALTER COLUMN "operator" SET NOT NULL;
  ALTER TABLE "forms_blocks_conditional" ALTER COLUMN "value" SET NOT NULL;
  ALTER TABLE "forms_blocks_multi_step_steps_locales" ALTER COLUMN "label" SET NOT NULL;
  ALTER TABLE "forms_emails" ALTER COLUMN "subject" SET NOT NULL;
  ALTER TABLE "forms_locales" ALTER COLUMN "title" SET NOT NULL;
  ALTER TABLE "forms" DROP COLUMN "_status";
  DROP TYPE "public"."enum_forms_status";
  DROP TYPE "public"."enum__forms_v_version_available_languages";
  DROP TYPE "public"."enum__forms_v_blocks_country_icon";
  DROP TYPE "public"."enum__forms_v_blocks_email_icon";
  DROP TYPE "public"."enum__forms_v_blocks_number_icon";
  DROP TYPE "public"."enum__forms_v_blocks_select_icon";
  DROP TYPE "public"."enum__forms_v_blocks_state_icon";
  DROP TYPE "public"."enum__forms_v_blocks_text_icon";
  DROP TYPE "public"."enum__forms_v_blocks_radio_direction";
  DROP TYPE "public"."enum__forms_v_blocks_rating_display";
  DROP TYPE "public"."enum__forms_v_blocks_image_size";
  DROP TYPE "public"."enum__forms_v_blocks_conditional_operator";
  DROP TYPE "public"."enum__forms_v_version_confirmation_type";
  DROP TYPE "public"."enum__forms_v_version_appearance_width";
  DROP TYPE "public"."enum__forms_v_version_appearance_card";
  DROP TYPE "public"."enum__forms_v_version_appearance_density";
  DROP TYPE "public"."enum__forms_v_version_appearance_field_style";
  DROP TYPE "public"."enum__forms_v_version_appearance_label_position";
  DROP TYPE "public"."enum__forms_v_version_appearance_radius";
  DROP TYPE "public"."enum__forms_v_version_appearance_button_style";
  DROP TYPE "public"."enum__forms_v_version_appearance_step_indicator";
  DROP TYPE "public"."enum__forms_v_version_appearance_background_overlay";
  DROP TYPE "public"."enum__forms_v_version_status";
  DROP TYPE "public"."enum__forms_v_published_locale";`)
}

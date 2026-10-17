import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_forms_available_languages" AS ENUM('en', 'ar');
  CREATE TYPE "public"."enum_forms_appearance_width" AS ENUM('narrow', 'medium', 'wide', 'full');
  CREATE TYPE "public"."enum_forms_appearance_card" AS ENUM('plain', 'card');
  CREATE TYPE "public"."enum_forms_appearance_density" AS ENUM('comfortable', 'compact');
  CREATE TYPE "public"."enum_forms_appearance_field_style" AS ENUM('outlined', 'filled', 'underlined');
  CREATE TYPE "public"."enum_forms_appearance_label_position" AS ENUM('above', 'floating', 'inline');
  CREATE TYPE "public"."enum_forms_appearance_radius" AS ENUM('none', 'small', 'medium', 'large', 'pill');
  CREATE TYPE "public"."enum_forms_appearance_button_style" AS ENUM('solid', 'outline');
  CREATE TYPE "public"."enum_forms_appearance_step_indicator" AS ENUM('progress', 'numbered', 'dots', 'none');
  CREATE TYPE "public"."enum_forms_appearance_background_overlay" AS ENUM('none', 'light', 'dark');
  CREATE TABLE "forms_available_languages" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_forms_available_languages",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  ALTER TABLE "forms" ADD COLUMN "slug" varchar;
  ALTER TABLE "forms" ADD COLUMN "slug_lock" boolean DEFAULT true;
  ALTER TABLE "forms" ADD COLUMN "is_active" boolean DEFAULT true;
  ALTER TABLE "forms" ADD COLUMN "active_from" timestamp(3) with time zone;
  ALTER TABLE "forms" ADD COLUMN "active_to" timestamp(3) with time zone;
  ALTER TABLE "forms" ADD COLUMN "requires_auth" boolean DEFAULT false;
  ALTER TABLE "forms" ADD COLUMN "show_sequence_number" boolean DEFAULT false;
  ALTER TABLE "forms" ADD COLUMN "header_image_id" integer;
  ALTER TABLE "forms" ADD COLUMN "has_terms" boolean DEFAULT false;
  ALTER TABLE "forms" ADD COLUMN "appearance_width" "enum_forms_appearance_width" DEFAULT 'medium';
  ALTER TABLE "forms" ADD COLUMN "appearance_card" "enum_forms_appearance_card" DEFAULT 'card';
  ALTER TABLE "forms" ADD COLUMN "appearance_density" "enum_forms_appearance_density" DEFAULT 'comfortable';
  ALTER TABLE "forms" ADD COLUMN "appearance_field_style" "enum_forms_appearance_field_style" DEFAULT 'outlined';
  ALTER TABLE "forms" ADD COLUMN "appearance_label_position" "enum_forms_appearance_label_position" DEFAULT 'above';
  ALTER TABLE "forms" ADD COLUMN "appearance_radius" "enum_forms_appearance_radius" DEFAULT 'medium';
  ALTER TABLE "forms" ADD COLUMN "appearance_button_style" "enum_forms_appearance_button_style" DEFAULT 'solid';
  ALTER TABLE "forms" ADD COLUMN "appearance_button_full_width" boolean DEFAULT false;
  ALTER TABLE "forms" ADD COLUMN "appearance_step_indicator" "enum_forms_appearance_step_indicator" DEFAULT 'progress';
  ALTER TABLE "forms" ADD COLUMN "appearance_accent_color" varchar;
  ALTER TABLE "forms" ADD COLUMN "appearance_background_image_id" integer;
  ALTER TABLE "forms" ADD COLUMN "appearance_background_overlay" "enum_forms_appearance_background_overlay" DEFAULT 'none';
  ALTER TABLE "forms" ADD COLUMN "custom_css" varchar;
  ALTER TABLE "forms_locales" ADD COLUMN "terms_content" jsonb;
  ALTER TABLE "forms_available_languages" ADD CONSTRAINT "forms_available_languages_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "forms_available_languages_order_idx" ON "forms_available_languages" USING btree ("order");
  CREATE INDEX "forms_available_languages_parent_idx" ON "forms_available_languages" USING btree ("parent_id");
  ALTER TABLE "forms" ADD CONSTRAINT "forms_header_image_id_media_id_fk" FOREIGN KEY ("header_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "forms" ADD CONSTRAINT "forms_appearance_background_image_id_media_id_fk" FOREIGN KEY ("appearance_background_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "forms_slug_idx" ON "forms" USING btree ("slug");
  CREATE INDEX "forms_header_image_idx" ON "forms" USING btree ("header_image_id");
  CREATE INDEX "forms_appearance_appearance_background_image_idx" ON "forms" USING btree ("appearance_background_image_id");
  -- existing forms: a slug from the title like formatSlug (src/fields/slug/formatSlug.ts), "form-<id>"
  -- when no letter or digit is left (e.g. an Arabic title), "-<id>" on a clash in the same tenant; and English
  UPDATE "forms" SET "slug" = lower(regexp_replace(replace("title", ' ', '-'), '[^A-Za-z0-9_-]+', '', 'g'))
    WHERE "slug" IS NULL;
  UPDATE "forms" SET "slug" = 'form-' || "id" WHERE "slug" !~ '[a-z0-9]';
  UPDATE "forms" AS f SET "slug" = f."slug" || '-' || f."id"
    WHERE EXISTS (
      SELECT 1 FROM "forms" o
      WHERE o."tenant_id" = f."tenant_id" AND o."slug" = f."slug" AND o."id" < f."id"
    );
  INSERT INTO "forms_available_languages" ("order", "parent_id", "value")
    SELECT 1, f."id", 'en' FROM "forms" f
    WHERE NOT EXISTS (SELECT 1 FROM "forms_available_languages" l WHERE l."parent_id" = f."id");
  CREATE UNIQUE INDEX "tenant_slug_4_idx" ON "forms" USING btree ("tenant_id","slug");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "forms_available_languages" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "forms_available_languages" CASCADE;
  ALTER TABLE "forms" DROP CONSTRAINT "forms_header_image_id_media_id_fk";
  
  ALTER TABLE "forms" DROP CONSTRAINT "forms_appearance_background_image_id_media_id_fk";
  
  DROP INDEX "forms_slug_idx";
  DROP INDEX "forms_header_image_idx";
  DROP INDEX "forms_appearance_appearance_background_image_idx";
  DROP INDEX "tenant_slug_4_idx";
  ALTER TABLE "forms" DROP COLUMN "slug";
  ALTER TABLE "forms" DROP COLUMN "slug_lock";
  ALTER TABLE "forms" DROP COLUMN "is_active";
  ALTER TABLE "forms" DROP COLUMN "active_from";
  ALTER TABLE "forms" DROP COLUMN "active_to";
  ALTER TABLE "forms" DROP COLUMN "requires_auth";
  ALTER TABLE "forms" DROP COLUMN "show_sequence_number";
  ALTER TABLE "forms" DROP COLUMN "header_image_id";
  ALTER TABLE "forms" DROP COLUMN "has_terms";
  ALTER TABLE "forms" DROP COLUMN "appearance_width";
  ALTER TABLE "forms" DROP COLUMN "appearance_card";
  ALTER TABLE "forms" DROP COLUMN "appearance_density";
  ALTER TABLE "forms" DROP COLUMN "appearance_field_style";
  ALTER TABLE "forms" DROP COLUMN "appearance_label_position";
  ALTER TABLE "forms" DROP COLUMN "appearance_radius";
  ALTER TABLE "forms" DROP COLUMN "appearance_button_style";
  ALTER TABLE "forms" DROP COLUMN "appearance_button_full_width";
  ALTER TABLE "forms" DROP COLUMN "appearance_step_indicator";
  ALTER TABLE "forms" DROP COLUMN "appearance_accent_color";
  ALTER TABLE "forms" DROP COLUMN "appearance_background_image_id";
  ALTER TABLE "forms" DROP COLUMN "appearance_background_overlay";
  ALTER TABLE "forms" DROP COLUMN "custom_css";
  ALTER TABLE "forms_locales" DROP COLUMN "terms_content";
  DROP TYPE "public"."enum_forms_available_languages";
  DROP TYPE "public"."enum_forms_appearance_width";
  DROP TYPE "public"."enum_forms_appearance_card";
  DROP TYPE "public"."enum_forms_appearance_density";
  DROP TYPE "public"."enum_forms_appearance_field_style";
  DROP TYPE "public"."enum_forms_appearance_label_position";
  DROP TYPE "public"."enum_forms_appearance_radius";
  DROP TYPE "public"."enum_forms_appearance_button_style";
  DROP TYPE "public"."enum_forms_appearance_step_indicator";
  DROP TYPE "public"."enum_forms_appearance_background_overlay";`)
}

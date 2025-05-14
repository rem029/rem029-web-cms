/* eslint-disable @typescript-eslint/no-unused-vars */
import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE IF NOT EXISTS "pages_blocks_cta_links_locales" (
  	"link_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "_pages_v_blocks_cta_links_locales" (
  	"link_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "header_nav_items_locales" (
  	"link_label" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "footer_nav_items_locales" (
  	"link_label" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  ALTER TABLE "pages_blocks_content_columns_locales" ADD COLUMN "link_label" varchar;
  ALTER TABLE "_pages_v_blocks_content_columns_locales" ADD COLUMN "link_label" varchar;
  DO $$ BEGIN
   ALTER TABLE "pages_blocks_cta_links_locales" ADD CONSTRAINT "pages_blocks_cta_links_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_cta_links"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "_pages_v_blocks_cta_links_locales" ADD CONSTRAINT "_pages_v_blocks_cta_links_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_cta_links"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "header_nav_items_locales" ADD CONSTRAINT "header_nav_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."header_nav_items"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "footer_nav_items_locales" ADD CONSTRAINT "footer_nav_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."footer_nav_items"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  CREATE UNIQUE INDEX IF NOT EXISTS "pages_blocks_cta_links_locales_locale_parent_id_unique" ON "pages_blocks_cta_links_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX IF NOT EXISTS "_pages_v_blocks_cta_links_locales_locale_parent_id_unique" ON "_pages_v_blocks_cta_links_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX IF NOT EXISTS "header_nav_items_locales_locale_parent_id_unique" ON "header_nav_items_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX IF NOT EXISTS "footer_nav_items_locales_locale_parent_id_unique" ON "footer_nav_items_locales" USING btree ("_locale","_parent_id");
  ALTER TABLE "pages_blocks_cta_links" DROP COLUMN IF EXISTS "link_label";
  ALTER TABLE "pages_blocks_content_columns" DROP COLUMN IF EXISTS "link_label";
  ALTER TABLE "_pages_v_blocks_cta_links" DROP COLUMN IF EXISTS "link_label";
  ALTER TABLE "_pages_v_blocks_content_columns" DROP COLUMN IF EXISTS "link_label";
  ALTER TABLE "header_nav_items" DROP COLUMN IF EXISTS "link_label";
  ALTER TABLE "footer_nav_items" DROP COLUMN IF EXISTS "link_label";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "pages_blocks_cta_links_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_cta_links_locales" CASCADE;
  DROP TABLE "header_nav_items_locales" CASCADE;
  DROP TABLE "footer_nav_items_locales" CASCADE;
  ALTER TABLE "pages_blocks_cta_links" ADD COLUMN "link_label" varchar;
  ALTER TABLE "pages_blocks_content_columns" ADD COLUMN "link_label" varchar;
  ALTER TABLE "_pages_v_blocks_cta_links" ADD COLUMN "link_label" varchar;
  ALTER TABLE "_pages_v_blocks_content_columns" ADD COLUMN "link_label" varchar;
  ALTER TABLE "header_nav_items" ADD COLUMN "link_label" varchar NOT NULL;
  ALTER TABLE "footer_nav_items" ADD COLUMN "link_label" varchar NOT NULL;
  ALTER TABLE "pages_blocks_content_columns_locales" DROP COLUMN IF EXISTS "link_label";
  ALTER TABLE "_pages_v_blocks_content_columns_locales" DROP COLUMN IF EXISTS "link_label";`)
}

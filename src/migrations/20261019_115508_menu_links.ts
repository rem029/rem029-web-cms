import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_pages_blocks_cta_links_link_type" ADD VALUE 'menus';
  ALTER TYPE "public"."enum_pages_blocks_content_columns_link_type" ADD VALUE 'menus';
  ALTER TYPE "public"."enum__pages_v_blocks_cta_links_link_type" ADD VALUE 'menus';
  ALTER TYPE "public"."enum__pages_v_blocks_content_columns_link_type" ADD VALUE 'menus';
  ALTER TYPE "public"."enum_header_nav_items_link_type" ADD VALUE 'menus' BEFORE 'group';
  ALTER TYPE "public"."enum_footer_nav_items_link_type" ADD VALUE 'menus' BEFORE 'group';
  ALTER TABLE "pages_rels" ADD COLUMN "menus_id" integer;
  ALTER TABLE "_pages_v_rels" ADD COLUMN "menus_id" integer;
  ALTER TABLE "header_rels" ADD COLUMN "menus_id" integer;
  ALTER TABLE "footer_rels" ADD COLUMN "menus_id" integer;
  ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_menus_fk" FOREIGN KEY ("menus_id") REFERENCES "public"."menus"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_menus_fk" FOREIGN KEY ("menus_id") REFERENCES "public"."menus"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "header_rels" ADD CONSTRAINT "header_rels_menus_fk" FOREIGN KEY ("menus_id") REFERENCES "public"."menus"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "footer_rels" ADD CONSTRAINT "footer_rels_menus_fk" FOREIGN KEY ("menus_id") REFERENCES "public"."menus"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_rels_menus_id_idx" ON "pages_rels" USING btree ("menus_id");
  CREATE INDEX "_pages_v_rels_menus_id_idx" ON "_pages_v_rels" USING btree ("menus_id");
  CREATE INDEX "header_rels_menus_id_idx" ON "header_rels" USING btree ("menus_id");
  CREATE INDEX "footer_rels_menus_id_idx" ON "footer_rels" USING btree ("menus_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  -- the old enums have no 'menus': "Our menus" links become the custom url /menu, so they keep
  -- working; rels rows that point at a menu are removed (those links then have no target)
  UPDATE "pages_blocks_cta_links" SET "link_type" = 'custom', "link_url" = '/menu' WHERE "link_type" = 'menus';
  UPDATE "pages_blocks_content_columns" SET "link_type" = 'custom', "link_url" = '/menu' WHERE "link_type" = 'menus';
  UPDATE "_pages_v_blocks_cta_links" SET "link_type" = 'custom', "link_url" = '/menu' WHERE "link_type" = 'menus';
  UPDATE "_pages_v_blocks_content_columns" SET "link_type" = 'custom', "link_url" = '/menu' WHERE "link_type" = 'menus';
  UPDATE "header_nav_items" SET "link_type" = 'custom', "link_url" = '/menu' WHERE "link_type" = 'menus';
  UPDATE "footer_nav_items" SET "link_type" = 'custom', "link_url" = '/menu' WHERE "link_type" = 'menus';
  DELETE FROM "pages_rels" WHERE "menus_id" IS NOT NULL;
  DELETE FROM "_pages_v_rels" WHERE "menus_id" IS NOT NULL;
  DELETE FROM "header_rels" WHERE "menus_id" IS NOT NULL;
  DELETE FROM "footer_rels" WHERE "menus_id" IS NOT NULL;
   ALTER TABLE "pages_rels" DROP CONSTRAINT "pages_rels_menus_fk";
  
  ALTER TABLE "_pages_v_rels" DROP CONSTRAINT "_pages_v_rels_menus_fk";
  
  ALTER TABLE "header_rels" DROP CONSTRAINT "header_rels_menus_fk";
  
  ALTER TABLE "footer_rels" DROP CONSTRAINT "footer_rels_menus_fk";
  
  ALTER TABLE "pages_blocks_cta_links" ALTER COLUMN "link_type" SET DATA TYPE text;
  ALTER TABLE "pages_blocks_cta_links" ALTER COLUMN "link_type" SET DEFAULT 'reference'::text;
  DROP TYPE "public"."enum_pages_blocks_cta_links_link_type";
  CREATE TYPE "public"."enum_pages_blocks_cta_links_link_type" AS ENUM('reference', 'custom');
  ALTER TABLE "pages_blocks_cta_links" ALTER COLUMN "link_type" SET DEFAULT 'reference'::"public"."enum_pages_blocks_cta_links_link_type";
  ALTER TABLE "pages_blocks_cta_links" ALTER COLUMN "link_type" SET DATA TYPE "public"."enum_pages_blocks_cta_links_link_type" USING "link_type"::"public"."enum_pages_blocks_cta_links_link_type";
  ALTER TABLE "pages_blocks_content_columns" ALTER COLUMN "link_type" SET DATA TYPE text;
  ALTER TABLE "pages_blocks_content_columns" ALTER COLUMN "link_type" SET DEFAULT 'reference'::text;
  DROP TYPE "public"."enum_pages_blocks_content_columns_link_type";
  CREATE TYPE "public"."enum_pages_blocks_content_columns_link_type" AS ENUM('reference', 'custom');
  ALTER TABLE "pages_blocks_content_columns" ALTER COLUMN "link_type" SET DEFAULT 'reference'::"public"."enum_pages_blocks_content_columns_link_type";
  ALTER TABLE "pages_blocks_content_columns" ALTER COLUMN "link_type" SET DATA TYPE "public"."enum_pages_blocks_content_columns_link_type" USING "link_type"::"public"."enum_pages_blocks_content_columns_link_type";
  ALTER TABLE "_pages_v_blocks_cta_links" ALTER COLUMN "link_type" SET DATA TYPE text;
  ALTER TABLE "_pages_v_blocks_cta_links" ALTER COLUMN "link_type" SET DEFAULT 'reference'::text;
  DROP TYPE "public"."enum__pages_v_blocks_cta_links_link_type";
  CREATE TYPE "public"."enum__pages_v_blocks_cta_links_link_type" AS ENUM('reference', 'custom');
  ALTER TABLE "_pages_v_blocks_cta_links" ALTER COLUMN "link_type" SET DEFAULT 'reference'::"public"."enum__pages_v_blocks_cta_links_link_type";
  ALTER TABLE "_pages_v_blocks_cta_links" ALTER COLUMN "link_type" SET DATA TYPE "public"."enum__pages_v_blocks_cta_links_link_type" USING "link_type"::"public"."enum__pages_v_blocks_cta_links_link_type";
  ALTER TABLE "_pages_v_blocks_content_columns" ALTER COLUMN "link_type" SET DATA TYPE text;
  ALTER TABLE "_pages_v_blocks_content_columns" ALTER COLUMN "link_type" SET DEFAULT 'reference'::text;
  DROP TYPE "public"."enum__pages_v_blocks_content_columns_link_type";
  CREATE TYPE "public"."enum__pages_v_blocks_content_columns_link_type" AS ENUM('reference', 'custom');
  ALTER TABLE "_pages_v_blocks_content_columns" ALTER COLUMN "link_type" SET DEFAULT 'reference'::"public"."enum__pages_v_blocks_content_columns_link_type";
  ALTER TABLE "_pages_v_blocks_content_columns" ALTER COLUMN "link_type" SET DATA TYPE "public"."enum__pages_v_blocks_content_columns_link_type" USING "link_type"::"public"."enum__pages_v_blocks_content_columns_link_type";
  ALTER TABLE "header_nav_items" ALTER COLUMN "link_type" SET DATA TYPE text;
  ALTER TABLE "header_nav_items" ALTER COLUMN "link_type" SET DEFAULT 'reference'::text;
  DROP TYPE "public"."enum_header_nav_items_link_type";
  CREATE TYPE "public"."enum_header_nav_items_link_type" AS ENUM('reference', 'custom', 'group');
  ALTER TABLE "header_nav_items" ALTER COLUMN "link_type" SET DEFAULT 'reference'::"public"."enum_header_nav_items_link_type";
  ALTER TABLE "header_nav_items" ALTER COLUMN "link_type" SET DATA TYPE "public"."enum_header_nav_items_link_type" USING "link_type"::"public"."enum_header_nav_items_link_type";
  ALTER TABLE "footer_nav_items" ALTER COLUMN "link_type" SET DATA TYPE text;
  ALTER TABLE "footer_nav_items" ALTER COLUMN "link_type" SET DEFAULT 'reference'::text;
  DROP TYPE "public"."enum_footer_nav_items_link_type";
  CREATE TYPE "public"."enum_footer_nav_items_link_type" AS ENUM('reference', 'custom', 'group');
  ALTER TABLE "footer_nav_items" ALTER COLUMN "link_type" SET DEFAULT 'reference'::"public"."enum_footer_nav_items_link_type";
  ALTER TABLE "footer_nav_items" ALTER COLUMN "link_type" SET DATA TYPE "public"."enum_footer_nav_items_link_type" USING "link_type"::"public"."enum_footer_nav_items_link_type";
  DROP INDEX "pages_rels_menus_id_idx";
  DROP INDEX "_pages_v_rels_menus_id_idx";
  DROP INDEX "header_rels_menus_id_idx";
  DROP INDEX "footer_rels_menus_id_idx";
  ALTER TABLE "pages_rels" DROP COLUMN "menus_id";
  ALTER TABLE "_pages_v_rels" DROP COLUMN "menus_id";
  ALTER TABLE "header_rels" DROP COLUMN "menus_id";
  ALTER TABLE "footer_rels" DROP COLUMN "menus_id";`)
}

/* eslint-disable @typescript-eslint/no-unused-vars */
import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages" ADD COLUMN "full_slug" varchar;
  ALTER TABLE "pages" ADD COLUMN "category_id" integer;
  ALTER TABLE "_pages_v" ADD COLUMN "version_full_slug" varchar;
  ALTER TABLE "_pages_v" ADD COLUMN "version_category_id" integer;
  DO $$ BEGIN
   ALTER TABLE "pages" ADD CONSTRAINT "pages_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_version_category_id_categories_id_fk" FOREIGN KEY ("version_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  CREATE INDEX IF NOT EXISTS "pages_category_idx" ON "pages" USING btree ("category_id");
  CREATE INDEX IF NOT EXISTS "_pages_v_version_version_category_idx" ON "_pages_v" USING btree ("version_category_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages" DROP CONSTRAINT "pages_category_id_categories_id_fk";
  
  ALTER TABLE "_pages_v" DROP CONSTRAINT "_pages_v_version_category_id_categories_id_fk";
  
  DROP INDEX IF EXISTS "pages_category_idx";
  DROP INDEX IF EXISTS "_pages_v_version_version_category_idx";
  ALTER TABLE "pages" DROP COLUMN IF EXISTS "full_slug";
  ALTER TABLE "pages" DROP COLUMN IF EXISTS "category_id";
  ALTER TABLE "_pages_v" DROP COLUMN IF EXISTS "version_full_slug";
  ALTER TABLE "_pages_v" DROP COLUMN IF EXISTS "version_category_id";`)
}

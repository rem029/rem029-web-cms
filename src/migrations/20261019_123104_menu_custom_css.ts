import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "menus" ADD COLUMN "custom_css" varchar;
  ALTER TABLE "_menus_v" ADD COLUMN "version_custom_css" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "menus" DROP COLUMN "custom_css";
  ALTER TABLE "_menus_v" DROP COLUMN "version_custom_css";`)
}

import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_users_access_access_slug" ADD VALUE 'order-waiter';
  ALTER TYPE "public"."enum_users_access_access_slug" ADD VALUE 'order-kitchen';
  ALTER TYPE "public"."enum_users_access_access_slug" ADD VALUE 'order-cashier';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   -- profile rows for staff boards would fail the cast back to the enum without its values: remove them
  DELETE FROM "users_access_access" WHERE "slug" IN ('order-waiter', 'order-kitchen', 'order-cashier');
  ALTER TABLE "users_access_access" ALTER COLUMN "slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_users_access_access_slug";
  CREATE TYPE "public"."enum_users_access_access_slug" AS ENUM('pages', 'posts', 'media', 'categories', 'users', 'users-access', 'analytics', 'tenants', 'header', 'footer', 'theme', 'settings', 'menu-categories', 'menu-allergens', 'menu-tags', 'menu-items', 'menus', 'tables', 'audit-logs', 'field-showcase', 'redirects', 'forms', 'form-submissions', 'search', 'field-showcase-global');
  ALTER TABLE "users_access_access" ALTER COLUMN "slug" SET DATA TYPE "public"."enum_users_access_access_slug" USING "slug"::"public"."enum_users_access_access_slug";`)
}

import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "orders" ADD COLUMN "assistance_requested_at" timestamp(3) with time zone;
  ALTER TABLE "orders" ADD COLUMN "bill_requested_at" timestamp(3) with time zone;
  ALTER TABLE "orders" ADD COLUMN "guest_token_hash" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "orders" DROP COLUMN "assistance_requested_at";
  ALTER TABLE "orders" DROP COLUMN "bill_requested_at";
  ALTER TABLE "orders" DROP COLUMN "guest_token_hash";`)
}

import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "orders" ADD COLUMN "cancel_reason" varchar;
  ALTER TABLE "orders" ADD COLUMN "confirmed_at" timestamp(3) with time zone;
  ALTER TABLE "orders" ADD COLUMN "preparing_at" timestamp(3) with time zone;
  ALTER TABLE "orders" ADD COLUMN "prepared_at" timestamp(3) with time zone;
  ALTER TABLE "orders" ADD COLUMN "served_at" timestamp(3) with time zone;
  ALTER TABLE "orders" ADD COLUMN "completed_at" timestamp(3) with time zone;
  ALTER TABLE "orders" ADD COLUMN "cancelled_at" timestamp(3) with time zone;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "orders" DROP COLUMN "cancel_reason";
  ALTER TABLE "orders" DROP COLUMN "confirmed_at";
  ALTER TABLE "orders" DROP COLUMN "preparing_at";
  ALTER TABLE "orders" DROP COLUMN "prepared_at";
  ALTER TABLE "orders" DROP COLUMN "served_at";
  ALTER TABLE "orders" DROP COLUMN "completed_at";
  ALTER TABLE "orders" DROP COLUMN "cancelled_at";`)
}

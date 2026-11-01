import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_settings_online_payments_provider" AS ENUM('none', 'test');
  ALTER TABLE "settings" ADD COLUMN "online_payments_provider" "enum_settings_online_payments_provider" DEFAULT 'none';
  ALTER TABLE "payments" ADD COLUMN "refund_due" boolean DEFAULT false;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "settings" DROP COLUMN "online_payments_provider";
  ALTER TABLE "payments" DROP COLUMN "refund_due";
  DROP TYPE "public"."enum_settings_online_payments_provider";`)
}

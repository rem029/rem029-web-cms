import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_audit_logs_operation" ADD VALUE 'login_failed';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  // failed-login rows would fail the enum recast below
  await db.execute(sql`
   DELETE FROM "audit_logs" WHERE "operation" = 'login_failed';
   ALTER TABLE "audit_logs" ALTER COLUMN "operation" SET DATA TYPE text;
  DROP TYPE "public"."enum_audit_logs_operation";
  CREATE TYPE "public"."enum_audit_logs_operation" AS ENUM('create', 'update', 'delete', 'login', 'logout');
  ALTER TABLE "audit_logs" ALTER COLUMN "operation" SET DATA TYPE "public"."enum_audit_logs_operation" USING "operation"::"public"."enum_audit_logs_operation";`)
}

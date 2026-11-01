import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_orders_close_reason" AS ENUM('walked_out', 'complimentary', 'staff_meal', 'other');
  CREATE TYPE "public"."enum_payments_method" AS ENUM('cash', 'card', 'online');
  CREATE TYPE "public"."enum_payments_status" AS ENUM('pending', 'succeeded', 'failed', 'cancelled', 'voided');
  ALTER TYPE "public"."enum_users_access_access_slug" ADD VALUE 'payments' BEFORE 'audit-logs';
  CREATE TABLE "payments" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"order_id" integer NOT NULL,
  	"method" "enum_payments_method" DEFAULT 'cash' NOT NULL,
  	"amount" numeric,
  	"status" "enum_payments_status" DEFAULT 'succeeded',
  	"received" numeric,
  	"change" numeric,
  	"reference" varchar,
  	"remarks" varchar,
  	"void_reason" varchar,
  	"order_number" numeric,
  	"menu_id" integer,
  	"currency" varchar,
  	"taken_by_id" integer,
  	"provider" varchar DEFAULT 'manual',
  	"provider_ref" varchar,
  	"created_by_id" integer,
  	"updated_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  -- one payment per order (user 2026-11-01): no part payments, so a part-paid order is unpaid
  UPDATE "orders" SET "payment_status" = 'unpaid' WHERE "payment_status" = 'partially_paid';
  ALTER TABLE "orders" ALTER COLUMN "payment_status" SET DATA TYPE text;
  ALTER TABLE "orders" ALTER COLUMN "payment_status" SET DEFAULT 'unpaid'::text;
  DROP TYPE "public"."enum_orders_payment_status";
  CREATE TYPE "public"."enum_orders_payment_status" AS ENUM('unpaid', 'paid', 'waived');
  ALTER TABLE "orders" ALTER COLUMN "payment_status" SET DEFAULT 'unpaid'::"public"."enum_orders_payment_status";
  ALTER TABLE "orders" ALTER COLUMN "payment_status" SET DATA TYPE "public"."enum_orders_payment_status" USING "payment_status"::"public"."enum_orders_payment_status";
  ALTER TABLE "orders" ADD COLUMN "close_reason" "enum_orders_close_reason";
  ALTER TABLE "orders" ADD COLUMN "close_note" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "payments_id" integer;
  ALTER TABLE "payments" ADD CONSTRAINT "payments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payments" ADD CONSTRAINT "payments_menu_id_menus_id_fk" FOREIGN KEY ("menu_id") REFERENCES "public"."menus"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payments" ADD CONSTRAINT "payments_taken_by_id_users_id_fk" FOREIGN KEY ("taken_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payments" ADD CONSTRAINT "payments_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payments" ADD CONSTRAINT "payments_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "payments_tenant_idx" ON "payments" USING btree ("tenant_id");
  CREATE INDEX "payments_order_idx" ON "payments" USING btree ("order_id");
  CREATE INDEX "payments_status_idx" ON "payments" USING btree ("status");
  CREATE INDEX "payments_menu_idx" ON "payments" USING btree ("menu_id");
  CREATE INDEX "payments_taken_by_idx" ON "payments" USING btree ("taken_by_id");
  CREATE INDEX "payments_created_by_idx" ON "payments" USING btree ("created_by_id");
  CREATE INDEX "payments_updated_by_idx" ON "payments" USING btree ("updated_by_id");
  CREATE INDEX "payments_updated_at_idx" ON "payments" USING btree ("updated_at");
  CREATE INDEX "payments_created_at_idx" ON "payments" USING btree ("created_at");
  CREATE UNIQUE INDEX "provider_providerRef_idx" ON "payments" USING btree ("provider","provider_ref");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_payments_fk" FOREIGN KEY ("payments_id") REFERENCES "public"."payments"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_payments_id_idx" ON "payload_locked_documents_rels" USING btree ("payments_id");
  ALTER TABLE "orders" DROP COLUMN "amount_paid";
  ALTER TABLE "orders" DROP COLUMN "balance";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_orders_payment_status" ADD VALUE 'partially_paid' BEFORE 'paid';
  -- generator bug: the CASCADE drop below already removes this foreign key, so drop it first
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_payments_fk";
  ALTER TABLE "payments" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "payments" CASCADE;
  -- profile rows on payments would not cast to the enum without it
  DELETE FROM "users_access_access" WHERE "slug" = 'payments';  
  ALTER TABLE "users_access_access" ALTER COLUMN "slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_users_access_access_slug";
  CREATE TYPE "public"."enum_users_access_access_slug" AS ENUM('pages', 'posts', 'media', 'categories', 'users', 'users-access', 'analytics', 'tenants', 'header', 'footer', 'theme', 'settings', 'menu-categories', 'menu-allergens', 'menu-tags', 'menu-items', 'menus', 'tables', 'orders', 'audit-logs', 'field-showcase', 'redirects', 'forms', 'form-submissions', 'search', 'field-showcase-global', 'order-waiter', 'order-kitchen', 'order-cashier');
  ALTER TABLE "users_access_access" ALTER COLUMN "slug" SET DATA TYPE "public"."enum_users_access_access_slug" USING "slug"::"public"."enum_users_access_access_slug";
  DROP INDEX "payload_locked_documents_rels_payments_id_idx";
  ALTER TABLE "orders" ADD COLUMN "amount_paid" numeric DEFAULT 0;
  ALTER TABLE "orders" ADD COLUMN "balance" numeric;
  -- paid and balance as phase 1 kept them: a paid order paid its total, any other owes it
  UPDATE "orders" SET "amount_paid" = CASE WHEN "payment_status" = 'paid' THEN "total" ELSE 0 END,
    "balance" = CASE WHEN "payment_status" = 'paid' THEN 0 ELSE "total" END;
  ALTER TABLE "orders" DROP COLUMN "close_reason";
  ALTER TABLE "orders" DROP COLUMN "close_note";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "payments_id";
  DROP TYPE "public"."enum_orders_close_reason";
  DROP TYPE "public"."enum_payments_method";
  DROP TYPE "public"."enum_payments_status";`)
}

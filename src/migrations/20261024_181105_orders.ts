import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_orders_status" AS ENUM('pending', 'confirmed', 'preparing', 'prepared', 'served', 'completed', 'cancelled');
  CREATE TYPE "public"."enum_orders_source" AS ENUM('guest', 'pos');
  CREATE TYPE "public"."enum_orders_type" AS ENUM('dine_in', 'takeaway');
  CREATE TYPE "public"."enum_orders_payment_status" AS ENUM('unpaid', 'partially_paid', 'paid', 'waived');
  CREATE TYPE "public"."enum_orders_flow" AS ENUM('waiter_kitchen_cashier', 'waiter_kitchen', 'kitchen_only');
  ALTER TYPE "public"."enum_users_access_access_slug" ADD VALUE 'orders' BEFORE 'audit-logs';
  CREATE TABLE "orders_items_selected_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"option" varchar NOT NULL,
  	"group" varchar,
  	"label" varchar,
  	"price" numeric
  );
  
  CREATE TABLE "orders_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"item_id" integer NOT NULL,
  	"quantity" numeric DEFAULT 1 NOT NULL,
  	"unit_price" numeric,
  	"line_total" numeric,
  	"title" varchar
  );
  
  CREATE TABLE "orders" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"order_number" numeric,
  	"order_date" varchar,
  	"status" "enum_orders_status" DEFAULT 'pending' NOT NULL,
  	"menu_id" integer NOT NULL,
  	"table_id" integer,
  	"source" "enum_orders_source" DEFAULT 'guest' NOT NULL,
  	"type" "enum_orders_type" DEFAULT 'dine_in' NOT NULL,
  	"guest_name" varchar,
  	"notes" varchar,
  	"subtotal" numeric,
  	"total" numeric,
  	"amount_paid" numeric DEFAULT 0,
  	"balance" numeric,
  	"payment_status" "enum_orders_payment_status" DEFAULT 'unpaid' NOT NULL,
  	"currency" varchar,
  	"flow" "enum_orders_flow",
  	"show_prices" boolean,
  	"created_by_id" integer,
  	"updated_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "order_counters" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant" numeric NOT NULL,
  	"date" varchar NOT NULL,
  	"last" numeric DEFAULT 0 NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "orders_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "order_counters_id" integer;
  ALTER TABLE "orders_items_selected_options" ADD CONSTRAINT "orders_items_selected_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."orders_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "orders_items" ADD CONSTRAINT "orders_items_item_id_menu_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."menu_items"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "orders_items" ADD CONSTRAINT "orders_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "orders" ADD CONSTRAINT "orders_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "orders" ADD CONSTRAINT "orders_menu_id_menus_id_fk" FOREIGN KEY ("menu_id") REFERENCES "public"."menus"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "orders" ADD CONSTRAINT "orders_table_id_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."tables"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "orders" ADD CONSTRAINT "orders_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "orders" ADD CONSTRAINT "orders_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "orders_items_selected_options_order_idx" ON "orders_items_selected_options" USING btree ("_order");
  CREATE INDEX "orders_items_selected_options_parent_id_idx" ON "orders_items_selected_options" USING btree ("_parent_id");
  CREATE INDEX "orders_items_order_idx" ON "orders_items" USING btree ("_order");
  CREATE INDEX "orders_items_parent_id_idx" ON "orders_items" USING btree ("_parent_id");
  CREATE INDEX "orders_items_item_idx" ON "orders_items" USING btree ("item_id");
  CREATE INDEX "orders_tenant_idx" ON "orders" USING btree ("tenant_id");
  CREATE INDEX "orders_order_date_idx" ON "orders" USING btree ("order_date");
  CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");
  CREATE INDEX "orders_menu_idx" ON "orders" USING btree ("menu_id");
  CREATE INDEX "orders_table_idx" ON "orders" USING btree ("table_id");
  CREATE INDEX "orders_payment_status_idx" ON "orders" USING btree ("payment_status");
  CREATE INDEX "orders_created_by_idx" ON "orders" USING btree ("created_by_id");
  CREATE INDEX "orders_updated_by_idx" ON "orders" USING btree ("updated_by_id");
  CREATE INDEX "orders_updated_at_idx" ON "orders" USING btree ("updated_at");
  CREATE INDEX "orders_created_at_idx" ON "orders" USING btree ("created_at");
  CREATE INDEX "order_counters_updated_at_idx" ON "order_counters" USING btree ("updated_at");
  CREATE INDEX "order_counters_created_at_idx" ON "order_counters" USING btree ("created_at");
  CREATE UNIQUE INDEX "tenant_date_idx" ON "order_counters" USING btree ("tenant","date");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_orders_fk" FOREIGN KEY ("orders_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_order_counters_fk" FOREIGN KEY ("order_counters_id") REFERENCES "public"."order_counters"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_orders_id_idx" ON "payload_locked_documents_rels" USING btree ("orders_id");
  CREATE INDEX "payload_locked_documents_rels_order_counters_id_idx" ON "payload_locked_documents_rels" USING btree ("order_counters_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "orders_items_selected_options" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "orders_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "orders" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "order_counters" DISABLE ROW LEVEL SECURITY;
  -- generator bug: the CASCADE drops below already remove these foreign keys, so drop them first
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_orders_fk";
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_order_counters_fk";
  DROP TABLE "orders_items_selected_options" CASCADE;
  DROP TABLE "orders_items" CASCADE;
  DROP TABLE "orders" CASCADE;
  DROP TABLE "order_counters" CASCADE;
  -- profile rows on orders would not cast to the enum without it
  DELETE FROM "users_access_access" WHERE "slug" = 'orders';
  ALTER TABLE "users_access_access" ALTER COLUMN "slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_users_access_access_slug";
  CREATE TYPE "public"."enum_users_access_access_slug" AS ENUM('pages', 'posts', 'media', 'categories', 'users', 'users-access', 'analytics', 'tenants', 'header', 'footer', 'theme', 'settings', 'menu-categories', 'menu-allergens', 'menu-tags', 'menu-items', 'menus', 'tables', 'audit-logs', 'field-showcase', 'redirects', 'forms', 'form-submissions', 'search', 'field-showcase-global', 'order-waiter', 'order-kitchen', 'order-cashier');
  ALTER TABLE "users_access_access" ALTER COLUMN "slug" SET DATA TYPE "public"."enum_users_access_access_slug" USING "slug"::"public"."enum_users_access_access_slug";
  DROP INDEX "payload_locked_documents_rels_orders_id_idx";
  DROP INDEX "payload_locked_documents_rels_order_counters_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "orders_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "order_counters_id";
  DROP TYPE "public"."enum_orders_status";
  DROP TYPE "public"."enum_orders_source";
  DROP TYPE "public"."enum_orders_type";
  DROP TYPE "public"."enum_orders_payment_status";
  DROP TYPE "public"."enum_orders_flow";`)
}

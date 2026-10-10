import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "categories" ADD COLUMN "created_by_id" integer;
  ALTER TABLE "categories" ADD COLUMN "updated_by_id" integer;
  ALTER TABLE "users" ADD COLUMN "created_by_id" integer;
  ALTER TABLE "users" ADD COLUMN "updated_by_id" integer;
  ALTER TABLE "redirects" ADD COLUMN "created_by_id" integer;
  ALTER TABLE "redirects" ADD COLUMN "updated_by_id" integer;
  ALTER TABLE "forms" ADD COLUMN "created_by_id" integer;
  ALTER TABLE "forms" ADD COLUMN "updated_by_id" integer;
  ALTER TABLE "categories" ADD CONSTRAINT "categories_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories" ADD CONSTRAINT "categories_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "users" ADD CONSTRAINT "users_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "users" ADD CONSTRAINT "users_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "redirects" ADD CONSTRAINT "redirects_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "redirects" ADD CONSTRAINT "redirects_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "forms" ADD CONSTRAINT "forms_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "forms" ADD CONSTRAINT "forms_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "categories_created_by_idx" ON "categories" USING btree ("created_by_id");
  CREATE INDEX "categories_updated_by_idx" ON "categories" USING btree ("updated_by_id");
  CREATE INDEX "users_created_by_idx" ON "users" USING btree ("created_by_id");
  CREATE INDEX "users_updated_by_idx" ON "users" USING btree ("updated_by_id");
  CREATE INDEX "redirects_created_by_idx" ON "redirects" USING btree ("created_by_id");
  CREATE INDEX "redirects_updated_by_idx" ON "redirects" USING btree ("updated_by_id");
  CREATE INDEX "forms_created_by_idx" ON "forms" USING btree ("created_by_id");
  CREATE INDEX "forms_updated_by_idx" ON "forms" USING btree ("updated_by_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "categories" DROP CONSTRAINT "categories_created_by_id_users_id_fk";
  
  ALTER TABLE "categories" DROP CONSTRAINT "categories_updated_by_id_users_id_fk";
  
  ALTER TABLE "users" DROP CONSTRAINT "users_created_by_id_users_id_fk";
  
  ALTER TABLE "users" DROP CONSTRAINT "users_updated_by_id_users_id_fk";
  
  ALTER TABLE "redirects" DROP CONSTRAINT "redirects_created_by_id_users_id_fk";
  
  ALTER TABLE "redirects" DROP CONSTRAINT "redirects_updated_by_id_users_id_fk";
  
  ALTER TABLE "forms" DROP CONSTRAINT "forms_created_by_id_users_id_fk";
  
  ALTER TABLE "forms" DROP CONSTRAINT "forms_updated_by_id_users_id_fk";
  
  DROP INDEX "categories_created_by_idx";
  DROP INDEX "categories_updated_by_idx";
  DROP INDEX "users_created_by_idx";
  DROP INDEX "users_updated_by_idx";
  DROP INDEX "redirects_created_by_idx";
  DROP INDEX "redirects_updated_by_idx";
  DROP INDEX "forms_created_by_idx";
  DROP INDEX "forms_updated_by_idx";
  ALTER TABLE "categories" DROP COLUMN "created_by_id";
  ALTER TABLE "categories" DROP COLUMN "updated_by_id";
  ALTER TABLE "users" DROP COLUMN "created_by_id";
  ALTER TABLE "users" DROP COLUMN "updated_by_id";
  ALTER TABLE "redirects" DROP COLUMN "created_by_id";
  ALTER TABLE "redirects" DROP COLUMN "updated_by_id";
  ALTER TABLE "forms" DROP COLUMN "created_by_id";
  ALTER TABLE "forms" DROP COLUMN "updated_by_id";`)
}

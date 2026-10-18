import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_field_showcase_labels" AS ENUM('apple', 'banana', 'cherry', 'date', 'elderberry', 'fig', 'grape', 'honeydew', 'kiwi', 'lemon', 'mango', 'nectarine');
  CREATE TYPE "public"."enum_field_showcase_visibility" AS ENUM('me', 'team', 'everyone');
  CREATE TYPE "public"."enum__field_showcase_v_version_labels" AS ENUM('apple', 'banana', 'cherry', 'date', 'elderberry', 'fig', 'grape', 'honeydew', 'kiwi', 'lemon', 'mango', 'nectarine');
  CREATE TYPE "public"."enum__field_showcase_v_version_visibility" AS ENUM('me', 'team', 'everyone');
  CREATE TABLE "field_showcase_labels" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_field_showcase_labels",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "_field_showcase_v_version_labels" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum__field_showcase_v_version_labels",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  ALTER TABLE "field_showcase" ADD COLUMN "priority" numeric;
  ALTER TABLE "field_showcase" ADD COLUMN "visibility" "enum_field_showcase_visibility" DEFAULT 'team';
  ALTER TABLE "field_showcase" ADD COLUMN "reviewer_id" integer;
  ALTER TABLE "field_showcase" ADD COLUMN "owner" varchar;
  ALTER TABLE "field_showcase" ADD COLUMN "summary" varchar;
  ALTER TABLE "field_showcase" ADD COLUMN "remind_at" timestamp(3) with time zone;
  ALTER TABLE "_field_showcase_v" ADD COLUMN "version_priority" numeric;
  ALTER TABLE "_field_showcase_v" ADD COLUMN "version_visibility" "enum__field_showcase_v_version_visibility" DEFAULT 'team';
  ALTER TABLE "_field_showcase_v" ADD COLUMN "version_reviewer_id" integer;
  ALTER TABLE "_field_showcase_v" ADD COLUMN "version_owner" varchar;
  ALTER TABLE "_field_showcase_v" ADD COLUMN "version_summary" varchar;
  ALTER TABLE "_field_showcase_v" ADD COLUMN "version_remind_at" timestamp(3) with time zone;
  ALTER TABLE "field_showcase_labels" ADD CONSTRAINT "field_showcase_labels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."field_showcase"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_field_showcase_v_version_labels" ADD CONSTRAINT "_field_showcase_v_version_labels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_field_showcase_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "field_showcase_labels_order_idx" ON "field_showcase_labels" USING btree ("order");
  CREATE INDEX "field_showcase_labels_parent_idx" ON "field_showcase_labels" USING btree ("parent_id");
  CREATE INDEX "_field_showcase_v_version_labels_order_idx" ON "_field_showcase_v_version_labels" USING btree ("order");
  CREATE INDEX "_field_showcase_v_version_labels_parent_idx" ON "_field_showcase_v_version_labels" USING btree ("parent_id");
  ALTER TABLE "field_showcase" ADD CONSTRAINT "field_showcase_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_field_showcase_v" ADD CONSTRAINT "_field_showcase_v_version_reviewer_id_users_id_fk" FOREIGN KEY ("version_reviewer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "field_showcase_reviewer_idx" ON "field_showcase" USING btree ("reviewer_id");
  CREATE INDEX "_field_showcase_v_version_version_reviewer_idx" ON "_field_showcase_v" USING btree ("version_reviewer_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "field_showcase_labels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_field_showcase_v_version_labels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "field_showcase_labels" CASCADE;
  DROP TABLE "_field_showcase_v_version_labels" CASCADE;
  ALTER TABLE "field_showcase" DROP CONSTRAINT "field_showcase_reviewer_id_users_id_fk";
  
  ALTER TABLE "_field_showcase_v" DROP CONSTRAINT "_field_showcase_v_version_reviewer_id_users_id_fk";
  
  DROP INDEX "field_showcase_reviewer_idx";
  DROP INDEX "_field_showcase_v_version_version_reviewer_idx";
  ALTER TABLE "field_showcase" DROP COLUMN "priority";
  ALTER TABLE "field_showcase" DROP COLUMN "visibility";
  ALTER TABLE "field_showcase" DROP COLUMN "reviewer_id";
  ALTER TABLE "field_showcase" DROP COLUMN "owner";
  ALTER TABLE "field_showcase" DROP COLUMN "summary";
  ALTER TABLE "field_showcase" DROP COLUMN "remind_at";
  ALTER TABLE "_field_showcase_v" DROP COLUMN "version_priority";
  ALTER TABLE "_field_showcase_v" DROP COLUMN "version_visibility";
  ALTER TABLE "_field_showcase_v" DROP COLUMN "version_reviewer_id";
  ALTER TABLE "_field_showcase_v" DROP COLUMN "version_owner";
  ALTER TABLE "_field_showcase_v" DROP COLUMN "version_summary";
  ALTER TABLE "_field_showcase_v" DROP COLUMN "version_remind_at";
  DROP TYPE "public"."enum_field_showcase_labels";
  DROP TYPE "public"."enum_field_showcase_visibility";
  DROP TYPE "public"."enum__field_showcase_v_version_labels";
  DROP TYPE "public"."enum__field_showcase_v_version_visibility";`)
}

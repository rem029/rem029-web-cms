import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "theme_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "settings_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  ALTER TABLE "pages" ADD COLUMN "is_hidden" boolean DEFAULT false;
  ALTER TABLE "pages_rels" ADD COLUMN "users_id" integer;
  ALTER TABLE "_pages_v" ADD COLUMN "version_is_hidden" boolean DEFAULT false;
  ALTER TABLE "_pages_v_rels" ADD COLUMN "users_id" integer;
  ALTER TABLE "posts" ADD COLUMN "is_hidden" boolean DEFAULT false;
  ALTER TABLE "posts" ADD COLUMN "created_by_id" integer;
  ALTER TABLE "posts" ADD COLUMN "updated_by_id" integer;
  ALTER TABLE "_posts_v" ADD COLUMN "version_is_hidden" boolean DEFAULT false;
  ALTER TABLE "_posts_v" ADD COLUMN "version_created_by_id" integer;
  ALTER TABLE "_posts_v" ADD COLUMN "version_updated_by_id" integer;
  ALTER TABLE "header" ADD COLUMN "is_hidden" boolean DEFAULT false;
  ALTER TABLE "header" ADD COLUMN "created_by_id" integer;
  ALTER TABLE "header" ADD COLUMN "updated_by_id" integer;
  ALTER TABLE "header_rels" ADD COLUMN "users_id" integer;
  ALTER TABLE "footer" ADD COLUMN "is_hidden" boolean DEFAULT false;
  ALTER TABLE "footer" ADD COLUMN "created_by_id" integer;
  ALTER TABLE "footer" ADD COLUMN "updated_by_id" integer;
  ALTER TABLE "footer_rels" ADD COLUMN "users_id" integer;
  ALTER TABLE "theme" ADD COLUMN "is_hidden" boolean DEFAULT false;
  ALTER TABLE "settings" ADD COLUMN "is_hidden" boolean DEFAULT false;
  ALTER TABLE "theme_rels" ADD CONSTRAINT "theme_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."theme"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "theme_rels" ADD CONSTRAINT "theme_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "settings_rels" ADD CONSTRAINT "settings_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "settings_rels" ADD CONSTRAINT "settings_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "theme_rels_order_idx" ON "theme_rels" USING btree ("order");
  CREATE INDEX "theme_rels_parent_idx" ON "theme_rels" USING btree ("parent_id");
  CREATE INDEX "theme_rels_path_idx" ON "theme_rels" USING btree ("path");
  CREATE INDEX "theme_rels_users_id_idx" ON "theme_rels" USING btree ("users_id");
  CREATE INDEX "settings_rels_order_idx" ON "settings_rels" USING btree ("order");
  CREATE INDEX "settings_rels_parent_idx" ON "settings_rels" USING btree ("parent_id");
  CREATE INDEX "settings_rels_path_idx" ON "settings_rels" USING btree ("path");
  CREATE INDEX "settings_rels_users_id_idx" ON "settings_rels" USING btree ("users_id");
  ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts" ADD CONSTRAINT "posts_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts" ADD CONSTRAINT "posts_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v" ADD CONSTRAINT "_posts_v_version_created_by_id_users_id_fk" FOREIGN KEY ("version_created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v" ADD CONSTRAINT "_posts_v_version_updated_by_id_users_id_fk" FOREIGN KEY ("version_updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "header" ADD CONSTRAINT "header_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "header" ADD CONSTRAINT "header_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "header_rels" ADD CONSTRAINT "header_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "footer" ADD CONSTRAINT "footer_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "footer" ADD CONSTRAINT "footer_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "footer_rels" ADD CONSTRAINT "footer_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_rels_users_id_idx" ON "pages_rels" USING btree ("users_id");
  CREATE INDEX "_pages_v_rels_users_id_idx" ON "_pages_v_rels" USING btree ("users_id");
  CREATE INDEX "posts_created_by_idx" ON "posts" USING btree ("created_by_id");
  CREATE INDEX "posts_updated_by_idx" ON "posts" USING btree ("updated_by_id");
  CREATE INDEX "_posts_v_version_version_created_by_idx" ON "_posts_v" USING btree ("version_created_by_id");
  CREATE INDEX "_posts_v_version_version_updated_by_idx" ON "_posts_v" USING btree ("version_updated_by_id");
  CREATE INDEX "header_created_by_idx" ON "header" USING btree ("created_by_id");
  CREATE INDEX "header_updated_by_idx" ON "header" USING btree ("updated_by_id");
  CREATE INDEX "header_rels_users_id_idx" ON "header_rels" USING btree ("users_id");
  CREATE INDEX "footer_created_by_idx" ON "footer" USING btree ("created_by_id");
  CREATE INDEX "footer_updated_by_idx" ON "footer" USING btree ("updated_by_id");
  CREATE INDEX "footer_rels_users_id_idx" ON "footer_rels" USING btree ("users_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  // the visibleTo rows would otherwise stay behind with no target (posts_rels.users_id is also
  // used by posts.authors, so only that column survives the down)
  await db.execute(sql`
  DELETE FROM "pages_rels" WHERE "path" = 'visibleTo';
  DELETE FROM "_pages_v_rels" WHERE "path" = 'version.visibleTo';
  DELETE FROM "posts_rels" WHERE "path" = 'visibleTo';
  DELETE FROM "_posts_v_rels" WHERE "path" = 'version.visibleTo';
  DELETE FROM "header_rels" WHERE "path" = 'visibleTo';
  DELETE FROM "footer_rels" WHERE "path" = 'visibleTo';`)

  await db.execute(sql`
   ALTER TABLE "theme_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "settings_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "theme_rels" CASCADE;
  DROP TABLE "settings_rels" CASCADE;
  ALTER TABLE "pages_rels" DROP CONSTRAINT "pages_rels_users_fk";
  
  ALTER TABLE "_pages_v_rels" DROP CONSTRAINT "_pages_v_rels_users_fk";
  
  ALTER TABLE "posts" DROP CONSTRAINT "posts_created_by_id_users_id_fk";
  
  ALTER TABLE "posts" DROP CONSTRAINT "posts_updated_by_id_users_id_fk";
  
  ALTER TABLE "_posts_v" DROP CONSTRAINT "_posts_v_version_created_by_id_users_id_fk";
  
  ALTER TABLE "_posts_v" DROP CONSTRAINT "_posts_v_version_updated_by_id_users_id_fk";
  
  ALTER TABLE "header" DROP CONSTRAINT "header_created_by_id_users_id_fk";
  
  ALTER TABLE "header" DROP CONSTRAINT "header_updated_by_id_users_id_fk";
  
  ALTER TABLE "header_rels" DROP CONSTRAINT "header_rels_users_fk";
  
  ALTER TABLE "footer" DROP CONSTRAINT "footer_created_by_id_users_id_fk";
  
  ALTER TABLE "footer" DROP CONSTRAINT "footer_updated_by_id_users_id_fk";
  
  ALTER TABLE "footer_rels" DROP CONSTRAINT "footer_rels_users_fk";
  
  DROP INDEX "pages_rels_users_id_idx";
  DROP INDEX "_pages_v_rels_users_id_idx";
  DROP INDEX "posts_created_by_idx";
  DROP INDEX "posts_updated_by_idx";
  DROP INDEX "_posts_v_version_version_created_by_idx";
  DROP INDEX "_posts_v_version_version_updated_by_idx";
  DROP INDEX "header_created_by_idx";
  DROP INDEX "header_updated_by_idx";
  DROP INDEX "header_rels_users_id_idx";
  DROP INDEX "footer_created_by_idx";
  DROP INDEX "footer_updated_by_idx";
  DROP INDEX "footer_rels_users_id_idx";
  ALTER TABLE "pages" DROP COLUMN "is_hidden";
  ALTER TABLE "pages_rels" DROP COLUMN "users_id";
  ALTER TABLE "_pages_v" DROP COLUMN "version_is_hidden";
  ALTER TABLE "_pages_v_rels" DROP COLUMN "users_id";
  ALTER TABLE "posts" DROP COLUMN "is_hidden";
  ALTER TABLE "posts" DROP COLUMN "created_by_id";
  ALTER TABLE "posts" DROP COLUMN "updated_by_id";
  ALTER TABLE "_posts_v" DROP COLUMN "version_is_hidden";
  ALTER TABLE "_posts_v" DROP COLUMN "version_created_by_id";
  ALTER TABLE "_posts_v" DROP COLUMN "version_updated_by_id";
  ALTER TABLE "header" DROP COLUMN "is_hidden";
  ALTER TABLE "header" DROP COLUMN "created_by_id";
  ALTER TABLE "header" DROP COLUMN "updated_by_id";
  ALTER TABLE "header_rels" DROP COLUMN "users_id";
  ALTER TABLE "footer" DROP COLUMN "is_hidden";
  ALTER TABLE "footer" DROP COLUMN "created_by_id";
  ALTER TABLE "footer" DROP COLUMN "updated_by_id";
  ALTER TABLE "footer_rels" DROP COLUMN "users_id";
  ALTER TABLE "theme" DROP COLUMN "is_hidden";
  ALTER TABLE "settings" DROP COLUMN "is_hidden";`)
}

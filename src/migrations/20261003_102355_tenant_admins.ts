import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "users_access_name_idx";
  DROP INDEX "users_access_slug_idx";
  ALTER TABLE "users_tenants" ADD COLUMN "is_tenant_admin" boolean DEFAULT false;
  ALTER TABLE "users_access" ADD COLUMN "tenant_id" integer;
  ALTER TABLE "users_access" ADD CONSTRAINT "users_access_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "users_access_tenant_idx" ON "users_access" USING btree ("tenant_id");`)

  // existing profiles become platform templates on the default tenant (`admin`). a NULL tenant
  // would also slip past the per-tenant unique indexes below, so a missing tenant fails loudly
  const { rows: profiles } = await db.execute(sql`SELECT count(*)::int AS n FROM "users_access"`)
  const profileCount = Number(profiles[0]?.n ?? 0)
  if (profileCount > 0) {
    const { rows: tenants } = await db.execute(
      sql`SELECT "id" FROM "tenants" WHERE "slug" = 'admin' LIMIT 1`,
    )
    if (!tenants[0]) {
      throw new Error('tenant_admins: default tenant "admin" not found, profiles need a tenant')
    }
    const result = await db.execute(sql`
      UPDATE "users_access" SET "tenant_id" = ${tenants[0].id} WHERE "tenant_id" IS NULL`)
    payload.logger.info({
      msg: 'tenant_admins: profiles moved to the admin tenant',
      count: result.rowCount,
    })
  }

  await db.execute(sql`
  CREATE UNIQUE INDEX "tenant_slug_3_idx" ON "users_access" USING btree ("tenant_id","slug");
  CREATE UNIQUE INDEX "tenant_name_idx" ON "users_access" USING btree ("tenant_id","name");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // slug and name go back to globally unique. tenant-made profiles may share them with another
  // tenant's (e.g. two "Editor"s); refuse instead of deleting or renaming tenant data
  const { rows: duplicates } = await db.execute(sql`
    SELECT 'slug' AS field, "slug" AS value FROM "users_access" GROUP BY "slug" HAVING count(*) > 1
    UNION ALL
    SELECT 'name', "name" FROM "users_access" GROUP BY "name" HAVING count(*) > 1`)
  if (duplicates.length > 0) {
    const list = duplicates.map((row) => `${row.field}=${row.value}`).join(', ')
    throw new Error(
      `tenant_admins down: profiles share a slug or name across tenants (${list}); rename or delete them first`,
    )
  }

  await db.execute(sql`
   ALTER TABLE "users_access" DROP CONSTRAINT "users_access_tenant_id_tenants_id_fk";
  
  DROP INDEX "users_access_tenant_idx";
  DROP INDEX "tenant_slug_3_idx";
  DROP INDEX "tenant_name_idx";
  CREATE UNIQUE INDEX "users_access_name_idx" ON "users_access" USING btree ("name");
  CREATE UNIQUE INDEX "users_access_slug_idx" ON "users_access" USING btree ("slug");
  ALTER TABLE "users_tenants" DROP COLUMN "is_tenant_admin";
  ALTER TABLE "users_access" DROP COLUMN "tenant_id";`)
}

import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * rem0001 phase 4: the access profile moves from the user (`users.access_id`) to each tenant
 * membership row (`users_tenants.access_id`).
 *
 * - up: every row gets its user's profile. A user with a profile and no tenant row loses it
 *   (they already saw no tenant data); each one is logged.
 * - down: the user gets the profile of their first row (`_order`). Lossless unless rows were
 *   edited to differ since `up`.
 * - `tenant_id DROP NOT NULL`: generated. Phase 3 put an `admin.condition` on the tenants array,
 *   which makes Payload drop NOT NULL on its child columns; the phase 3 migration predates it.
 */
export async function up({ db, payload }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "users" DROP CONSTRAINT "users_access_id_users_access_id_fk";

  DROP INDEX "users_access_idx";
  ALTER TABLE "users_tenants" ALTER COLUMN "tenant_id" DROP NOT NULL;
  ALTER TABLE "users_tenants" ADD COLUMN "access_id" integer;
  ALTER TABLE "users_tenants" ADD CONSTRAINT "users_tenants_access_id_users_access_id_fk" FOREIGN KEY ("access_id") REFERENCES "public"."users_access"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "users_tenants_access_idx" ON "users_tenants" USING btree ("access_id");`)

  const copied = await db.execute(sql`
    UPDATE users_tenants ut SET access_id = u.access_id
    FROM users u
    WHERE ut._parent_id = u.id AND u.access_id IS NOT NULL AND ut.access_id IS NULL`)
  payload.logger.info({
    msg: 'migration: copied user access profiles onto tenant rows',
    rows: copied.rowCount,
  })

  const orphans = await db.execute(sql`
    SELECT u.email FROM users u
    WHERE u.access_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM users_tenants ut WHERE ut._parent_id = u.id)`)
  for (const row of orphans.rows) {
    payload.logger.warn({
      msg: 'migration: user has an access profile but no tenant row, profile dropped',
      email: row.email,
    })
  }

  await db.execute(sql`
  ALTER TABLE "users" DROP COLUMN "access_id";`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "users_tenants" DROP CONSTRAINT "users_tenants_access_id_users_access_id_fk";

  DROP INDEX "users_tenants_access_idx";
  ALTER TABLE "users_tenants" ALTER COLUMN "tenant_id" SET NOT NULL;
  ALTER TABLE "users" ADD COLUMN "access_id" integer;
  ALTER TABLE "users" ADD CONSTRAINT "users_access_id_users_access_id_fk" FOREIGN KEY ("access_id") REFERENCES "public"."users_access"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "users_access_idx" ON "users" USING btree ("access_id");`)

  await db.execute(sql`
    UPDATE users u SET access_id = (
      SELECT ut.access_id FROM users_tenants ut
      WHERE ut._parent_id = u.id
      ORDER BY ut._order
      LIMIT 1
    )`)

  await db.execute(sql`
  ALTER TABLE "users_tenants" DROP COLUMN "access_id";`)
}

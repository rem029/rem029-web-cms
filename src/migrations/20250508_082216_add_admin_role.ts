import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

const ROLE_SLUG = 'admin'

// Plain SQL, not the Local API: the `roles` collection was removed in rem0001 phase 2
// (replaced by `users-access`), so `payload.create({ collection: 'roles' })` no longer works on a
// fresh database. Same rows as before: one Admin role with full rights on every collection and
// global in the current config.
export async function up({ db, payload }: MigrateUpArgs): Promise<void> {
  const collections = payload.config.collections.map((c) => c.slug)
  const globals = payload.config.globals.map((g) => g.slug)

  const { rows } = await db.execute(sql`
    INSERT INTO "roles" ("name", "slug", "description", "is_admin")
    VALUES ('Admin', ${ROLE_SLUG}, 'Default Admin Access', true)
    RETURNING "id"
  `)
  const roleId = (rows[0] as { id: number }).id

  for (const [order, slug] of collections.entries()) {
    await db.execute(sql`
      INSERT INTO "roles_collections_permissions"
        ("_order", "_parent_id", "id", "collection", "can_create", "can_read", "can_update", "can_delete")
      VALUES (${order + 1}, ${roleId}, ${`${roleId}-c-${order}`}, ${slug}, true, true, true, true)
    `)
  }

  for (const [order, slug] of globals.entries()) {
    await db.execute(sql`
      INSERT INTO "roles_globals_permissions" ("_order", "_parent_id", "id", "global", "can_read", "can_update")
      VALUES (${order + 1}, ${roleId}, ${`${roleId}-g-${order}`}, ${slug}, true, true)
    `)
  }
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // permission rows go with it (ON DELETE CASCADE)
  await db.execute(sql`DELETE FROM "roles" WHERE "slug" = ${ROLE_SLUG}`)
}

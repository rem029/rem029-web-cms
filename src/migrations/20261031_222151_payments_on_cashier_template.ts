import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * rem0018 phase 2 step 1: the `cashier` template (admin tenant, phase 1 step 2) gets `payments`
 * read + create + update, so cashiers record and void the payments of the menus that list them.
 * Its own migration: `20261031_222051_payments` adds the `payments` enum value, and Postgres
 * can't use a new enum value in the transaction that added it.
 *
 * up: the template's `payments` row is set to shown + read + create + update (inserted at the end
 *     when it has none). A missing template fails loudly.
 * down: the template's `payments` row is deleted (missing row = deny, as before).
 */

// Payload array row ids are 24-char hex strings
const rowId = sql`substr(md5(random()::text || clock_timestamp()::text), 1, 24)`

const isIdRow = (row: unknown): row is { id: number } =>
  typeof row === 'object' && row !== null && 'id' in row && typeof row.id === 'number'

export async function up({ db, payload }: MigrateUpArgs): Promise<void> {
  const { rows } = await db.execute(sql`
    SELECT ua.id FROM users_access ua
    JOIN tenants t ON t.id = ua.tenant_id
    WHERE t.slug = 'admin' AND ua.slug = 'cashier' AND ua.is_template
    LIMIT 1
  `)
  const template = rows[0]
  if (!isIdRow(template)) {
    throw new Error(
      'payments_on_cashier_template: template "cashier" not found on the admin tenant',
    )
  }

  const { rows: updated } = await db.execute(sql`
    UPDATE users_access_access SET hidden = false, read = true, "create" = true, update = true
    WHERE _parent_id = ${template.id} AND slug = 'payments'
    RETURNING _parent_id
  `)
  if (updated.length === 0) {
    await db.execute(sql`
      INSERT INTO users_access_access
        (_order, _parent_id, id, slug, hidden, read, "create", update, delete, admin, access)
      SELECT COALESCE(MAX(_order), 0) + 1, ${template.id}, ${rowId}, 'payments', false, true, true,
        true, false, false, false
      FROM users_access_access WHERE _parent_id = ${template.id}
    `)
  }

  payload.logger.info({ msg: 'payments_on_cashier_template: payments read + create + update' })
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DELETE FROM users_access_access
    WHERE slug = 'payments' AND _parent_id IN (
      SELECT ua.id FROM users_access ua
      JOIN tenants t ON t.id = ua.tenant_id
      WHERE t.slug = 'admin' AND ua.is_template AND ua.slug = 'cashier'
    )
  `)
}

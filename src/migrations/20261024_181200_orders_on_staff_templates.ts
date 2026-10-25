import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * rem0018 phase 1 step 3a: the staff templates (`waiter`, `kitchen`, `cashier` on the admin
 * tenant, step 2) get `orders` read + update, so staff can see and move the orders of the menus
 * that list them. Its own migration: `20261024_181105_orders` adds the `orders` enum value, and
 * Postgres can't use a new enum value in the transaction that added it.
 *
 * up: per template, the `orders` row is set to shown + read + update (inserted at the end when
 *     the template has none). A missing template fails loudly.
 * down: the templates' `orders` rows are deleted (missing row = deny, as before).
 */

const TEMPLATE_SLUGS = ['waiter', 'kitchen', 'cashier']

// Payload array row ids are 24-char hex strings
const rowId = sql`substr(md5(random()::text || clock_timestamp()::text), 1, 24)`

const isIdRow = (row: unknown): row is { id: number } =>
  typeof row === 'object' && row !== null && 'id' in row && typeof row.id === 'number'

export async function up({ db, payload }: MigrateUpArgs): Promise<void> {
  for (const slug of TEMPLATE_SLUGS) {
    const { rows } = await db.execute(sql`
      SELECT ua.id FROM users_access ua
      JOIN tenants t ON t.id = ua.tenant_id
      WHERE t.slug = 'admin' AND ua.slug = ${slug} AND ua.is_template
      LIMIT 1
    `)
    const template = rows[0]
    if (!isIdRow(template)) {
      throw new Error(`orders_on_staff_templates: template "${slug}" not found on the admin tenant`)
    }

    const { rows: updated } = await db.execute(sql`
      UPDATE users_access_access SET hidden = false, read = true, update = true
      WHERE _parent_id = ${template.id} AND slug = 'orders'
      RETURNING _parent_id
    `)
    if (updated.length === 0) {
      await db.execute(sql`
        INSERT INTO users_access_access
          (_order, _parent_id, id, slug, hidden, read, "create", update, delete, admin, access)
        SELECT COALESCE(MAX(_order), 0) + 1, ${template.id}, ${rowId}, 'orders', false, true, false,
          true, false, false, false
        FROM users_access_access WHERE _parent_id = ${template.id}
      `)
    }

    payload.logger.info({ msg: 'orders_on_staff_templates: orders read + update', slug })
  }
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DELETE FROM users_access_access
    WHERE slug = 'orders' AND _parent_id IN (
      SELECT ua.id FROM users_access ua
      JOIN tenants t ON t.id = ua.tenant_id
      WHERE t.slug = 'admin' AND ua.is_template AND ua.slug IN ('waiter', 'kitchen', 'cashier')
    )
  `)
}

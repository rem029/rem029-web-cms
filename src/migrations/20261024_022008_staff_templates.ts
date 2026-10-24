import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * rem0018 phase 1 step 2: staff templates.
 *
 * Creates platform templates `waiter`, `kitchen` and `cashier` on the admin tenant.
 * Step 3 adds `orders` read + update to all three templates; phase 2 adds `payments` to `cashier`.
 *
 * up:
 * - Find admin tenant ('admin'), fail loudly if missing
 * - Create 'waiter', 'kitchen' and 'cashier' templates on the admin tenant if not already existing
 * - If a non-template profile already exists on the admin tenant with that slug or name, fail loudly
 * - Grants: `menus` {hidden:false, read:true}; `users` {hidden:true, admin:true};
 *   its own board (order-waiter / order-kitchen / order-cashier) {hidden:false, read:true};
 *   every other slug hidden:true and all false
 *
 * down:
 * - Reassign users_tenants rows using these templates to the admin-tenant 'default' profile
 * - Delete 'waiter', 'kitchen' and 'cashier' templates on the admin tenant (and their access rows)
 */

// frozen at the time of writing; the live config may have more slugs later (missing row = deny)
const SLUGS = [
  'pages',
  'posts',
  'media',
  'categories',
  'users',
  'users-access',
  'analytics',
  'tenants',
  'header',
  'footer',
  'theme',
  'settings',
  'menu-categories',
  'menu-allergens',
  'menu-tags',
  'menu-items',
  'menus',
  'tables',
  'audit-logs',
  'field-showcase',
  'redirects',
  'forms',
  'form-submissions',
  'search',
  'field-showcase-global',
  'order-waiter',
  'order-kitchen',
  'order-cashier',
]

// Payload array row ids are 24-char hex strings
const rowId = sql`substr(md5(random()::text || clock_timestamp()::text), 1, 24)`

type Grant = {
  hidden: boolean
  read: boolean
  create: boolean
  update: boolean
  delete: boolean
  admin: boolean
}

type TemplateDefinition = {
  slug: string
  name: string
  description: string
  boardSlug: string
}

const TEMPLATES: TemplateDefinition[] = [
  {
    slug: 'waiter',
    name: 'Waiter',
    description:
      "Takes guests' orders on the waiter board of the menus that list them. Can open the admin panel.",
    boardSlug: 'order-waiter',
  },
  {
    slug: 'kitchen',
    name: 'Kitchen',
    description:
      'Prepares orders on the kitchen board of the menus that list them. Can open the admin panel.',
    boardSlug: 'order-kitchen',
  },
  {
    slug: 'cashier',
    name: 'Cashier',
    description:
      'Closes orders on the cashier board of the menus that list them. Can open the admin panel.',
    boardSlug: 'order-cashier',
  },
]

const getGrant = (tmpl: TemplateDefinition, slug: string): Grant => {
  if (slug === 'menus') {
    return { hidden: false, read: true, create: false, update: false, delete: false, admin: false }
  }
  if (slug === 'users') {
    return { hidden: true, read: false, create: false, update: false, delete: false, admin: true }
  }
  if (slug === tmpl.boardSlug) {
    return { hidden: false, read: true, create: false, update: false, delete: false, admin: false }
  }
  return {
    hidden: true,
    read: false,
    create: false,
    update: false,
    delete: false,
    admin: false,
  }
}

type ExistingProfileRow = {
  id: number
  slug: string
  name: string
  is_template: boolean | null
}

export async function up({ db, payload }: MigrateUpArgs): Promise<void> {
  const { rows: adminTenants } = await db.execute(sql`
    SELECT id FROM tenants WHERE slug = 'admin' LIMIT 1
  `)
  const adminTenant = adminTenants[0] as { id: number } | undefined
  if (!adminTenant || typeof adminTenant.id !== 'number') {
    throw new Error('staff_templates: admin tenant "admin" not found')
  }
  const adminTenantId = adminTenant.id

  for (const tmpl of TEMPLATES) {
    const { rows: existingRows } = await db.execute(sql`
      SELECT id, slug, name, is_template
      FROM users_access
      WHERE tenant_id = ${adminTenantId} AND (slug = ${tmpl.slug} OR name = ${tmpl.name})
    `)

    const exactMatch = (existingRows as ExistingProfileRow[]).find((r) => r.slug === tmpl.slug)
    if (exactMatch && exactMatch.is_template === true) {
      payload.logger.info({
        msg: 'staff_templates: skipped, already a template',
        slug: tmpl.slug,
      })
      continue
    }

    if (existingRows.length > 0) {
      const conflict = existingRows[0] as ExistingProfileRow
      const conflictVal = conflict.slug === tmpl.slug ? conflict.slug : conflict.name
      throw new Error(
        `staff_templates: profile "${conflictVal}" already exists on the admin tenant and is not a template; rename it, then migrate`,
      )
    }

    const { rows: inserted } = await db.execute(sql`
      INSERT INTO users_access (name, slug, description, tenant_id, is_template)
      VALUES (${tmpl.name}, ${tmpl.slug}, ${tmpl.description}, ${adminTenantId}, true)
      RETURNING id
    `)
    const profileRow = inserted[0] as { id: number } | undefined
    if (!profileRow || typeof profileRow.id !== 'number') {
      throw new Error(`staff_templates: failed to insert template profile "${tmpl.slug}"`)
    }
    const profileId = profileRow.id

    for (const [i, slugName] of SLUGS.entries()) {
      const order = i + 1
      const grant = getGrant(tmpl, slugName)
      await db.execute(sql`
        INSERT INTO users_access_access
          (_order, _parent_id, id, slug, hidden, read, "create", update, delete, admin, access)
        VALUES (
          ${order},
          ${profileId},
          ${rowId},
          ${slugName}::enum_users_access_access_slug,
          ${grant.hidden},
          ${grant.read},
          ${grant.create},
          ${grant.update},
          ${grant.delete},
          ${grant.admin},
          false
        )
      `)
    }

    payload.logger.info({
      msg: 'staff_templates: created template profile',
      slug: tmpl.slug,
      id: profileId,
    })
  }
}

export async function down({ db, payload }: MigrateDownArgs): Promise<void> {
  const { rows: adminTenants } = await db.execute(sql`
    SELECT id FROM tenants WHERE slug = 'admin' LIMIT 1
  `)
  const adminTenant = adminTenants[0] as { id: number } | undefined
  if (!adminTenant || typeof adminTenant.id !== 'number') {
    throw new Error('staff_templates down: admin tenant "admin" not found')
  }
  const adminTenantId = adminTenant.id

  const { rows: defaultProfiles } = await db.execute(sql`
    SELECT id FROM users_access WHERE slug = 'default' AND tenant_id = ${adminTenantId} LIMIT 1
  `)
  const defaultProfile = defaultProfiles[0] as { id: number } | undefined
  if (!defaultProfile || typeof defaultProfile.id !== 'number') {
    throw new Error('staff_templates down: default profile on admin tenant not found')
  }
  const defaultProfileId = defaultProfile.id

  const { rows: reassignedUsers } = await db.execute(sql`
    UPDATE users_tenants
    SET access_id = ${defaultProfileId}
    WHERE access_id IN (
      SELECT id FROM users_access
      WHERE is_template AND tenant_id = ${adminTenantId} AND slug IN ('waiter', 'kitchen', 'cashier')
    )
    RETURNING _parent_id, tenant_id
  `)
  for (const row of reassignedUsers as { _parent_id: number; tenant_id: number }[]) {
    payload.logger.warn({
      msg: 'staff_templates down: user moved to default',
      userId: row._parent_id,
      tenantId: row.tenant_id,
    })
  }

  await db.execute(sql`
    DELETE FROM users_access_access
    WHERE _parent_id IN (
      SELECT id FROM users_access
      WHERE is_template AND tenant_id = ${adminTenantId} AND slug IN ('waiter', 'kitchen', 'cashier')
    )
  `)

  await db.execute(sql`
    DELETE FROM users_access
    WHERE is_template AND tenant_id = ${adminTenantId} AND slug IN ('waiter', 'kitchen', 'cashier')
  `)
}

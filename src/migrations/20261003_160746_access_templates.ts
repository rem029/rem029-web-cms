import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * rem0001 phase 7: access templates.
 *
 * Adds `users_access.is_template`, marks the admin-tenant `default` profile as a template,
 * and creates platform templates `pages-editor` and `pages-viewer` on the admin tenant.
 *
 * up:
 * - ADD COLUMN users_access.is_template boolean DEFAULT false
 * - Find admin tenant ('admin'), fail loudly if missing
 * - Mark admin-tenant 'default' profile as is_template = true
 * - Create 'pages-editor' and 'pages-viewer' templates on the admin tenant if not already existing
 * - If a non-template profile already exists on the admin tenant with that slug or name, fail loudly
 *
 * down:
 * - Reassign user tenant rows using 'pages-editor' or 'pages-viewer' to the admin-tenant 'default' profile
 * - Delete 'pages-editor' and 'pages-viewer' templates on the admin tenant
 * - DROP COLUMN users_access.is_template
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
  'redirects',
  'forms',
  'form-submissions',
  'search',
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
  grants: (slug: string) => Grant
}

const TEMPLATES: TemplateDefinition[] = [
  {
    slug: 'pages-editor',
    name: 'Pages editor',
    description: 'Edits pages and adds images. Can open the admin panel.',
    grants: (slug: string): Grant => {
      if (slug === 'pages') {
        return { hidden: false, read: true, create: true, update: true, delete: true, admin: false }
      }
      if (slug === 'media') {
        return {
          hidden: false,
          read: true,
          create: true,
          update: false,
          delete: false,
          admin: false,
        }
      }
      if (slug === 'users') {
        return {
          hidden: true,
          read: false,
          create: false,
          update: false,
          delete: false,
          admin: true,
        }
      }
      return {
        hidden: true,
        read: false,
        create: false,
        update: false,
        delete: false,
        admin: false,
      }
    },
  },
  {
    slug: 'pages-viewer',
    name: 'Pages viewer',
    description: 'Reads pages. Can open the admin panel.',
    grants: (slug: string): Grant => {
      if (slug === 'pages') {
        return {
          hidden: false,
          read: true,
          create: false,
          update: false,
          delete: false,
          admin: false,
        }
      }
      if (slug === 'users') {
        return {
          hidden: true,
          read: false,
          create: false,
          update: false,
          delete: false,
          admin: true,
        }
      }
      return {
        hidden: true,
        read: false,
        create: false,
        update: false,
        delete: false,
        admin: false,
      }
    },
  },
]

type ExistingProfileRow = {
  id: number
  slug: string
  name: string
  is_template: boolean | null
}

export async function up({ db, payload }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "users_access" ADD COLUMN "is_template" boolean DEFAULT false;`)

  const { rows: adminTenants } = await db.execute(sql`
    SELECT id FROM tenants WHERE slug = 'admin' LIMIT 1
  `)
  const adminTenant = adminTenants[0] as { id: number } | undefined
  if (!adminTenant || typeof adminTenant.id !== 'number') {
    throw new Error('access_templates: admin tenant "admin" not found')
  }
  const adminTenantId = adminTenant.id

  const defaultUpdateResult = await db.execute(sql`
    UPDATE users_access SET is_template = true WHERE slug = 'default' AND tenant_id = ${adminTenantId}
  `)
  payload.logger.info({
    msg: 'access_templates: marked default profile as template',
    rowCount: defaultUpdateResult.rowCount,
  })

  for (const tmpl of TEMPLATES) {
    const { rows: existingRows } = await db.execute(sql`
      SELECT id, slug, name, is_template
      FROM users_access
      WHERE tenant_id = ${adminTenantId} AND (slug = ${tmpl.slug} OR name = ${tmpl.name})
    `)

    const exactMatch = (existingRows as ExistingProfileRow[]).find((r) => r.slug === tmpl.slug)
    if (exactMatch && exactMatch.is_template === true) {
      payload.logger.info({
        msg: 'access_templates: skipped, already a template',
        slug: tmpl.slug,
      })
      continue
    }

    if (existingRows.length > 0) {
      const conflict = existingRows[0] as ExistingProfileRow
      const conflictVal = conflict.slug === tmpl.slug ? conflict.slug : conflict.name
      throw new Error(
        `access_templates: profile "${conflictVal}" already exists on the admin tenant and is not a template; rename it, then migrate`,
      )
    }

    const { rows: inserted } = await db.execute(sql`
      INSERT INTO users_access (name, slug, description, tenant_id, is_template)
      VALUES (${tmpl.name}, ${tmpl.slug}, ${tmpl.description}, ${adminTenantId}, true)
      RETURNING id
    `)
    const profileRow = inserted[0] as { id: number } | undefined
    if (!profileRow || typeof profileRow.id !== 'number') {
      throw new Error(`access_templates: failed to insert template profile "${tmpl.slug}"`)
    }
    const profileId = profileRow.id

    for (const [i, slugName] of SLUGS.entries()) {
      const order = i + 1
      const grant = tmpl.grants(slugName)
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
      msg: 'access_templates: created template profile',
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
    throw new Error('access_templates down: admin tenant "admin" not found')
  }
  const adminTenantId = adminTenant.id

  const { rows: defaultProfiles } = await db.execute(sql`
    SELECT id FROM users_access WHERE slug = 'default' AND tenant_id = ${adminTenantId} LIMIT 1
  `)
  const defaultProfile = defaultProfiles[0] as { id: number } | undefined
  if (!defaultProfile || typeof defaultProfile.id !== 'number') {
    throw new Error('access_templates down: default profile on admin tenant not found')
  }
  const defaultProfileId = defaultProfile.id

  const { rows: reassignedUsers } = await db.execute(sql`
    UPDATE users_tenants
    SET access_id = ${defaultProfileId}
    WHERE access_id IN (
      SELECT id FROM users_access
      WHERE is_template AND tenant_id = ${adminTenantId} AND slug IN ('pages-editor', 'pages-viewer')
    )
    RETURNING _parent_id, tenant_id
  `)
  for (const row of reassignedUsers as { _parent_id: number; tenant_id: number }[]) {
    payload.logger.warn({
      msg: 'access_templates down: user moved to default',
      userId: row._parent_id,
      tenantId: row.tenant_id,
    })
  }

  await db.execute(sql`
    DELETE FROM users_access
    WHERE is_template AND tenant_id = ${adminTenantId} AND slug IN ('pages-editor', 'pages-viewer')
  `)

  await db.execute(sql`
   ALTER TABLE "users_access" DROP COLUMN "is_template";`)
}

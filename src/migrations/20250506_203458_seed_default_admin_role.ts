import { RoleCollectionPermissions, RoleGlobalPermissions } from '@/payload-types'
import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

const ROLE_SLUG = 'admin'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  let { collections, globals } = payload.config
  const _collections = collections.map((c) => c.slug)
  const _globals = globals.map((g) => g.slug)

  const collectionPermissions: RoleCollectionPermissions = _collections.map((c) => {
    const slug = c as string
    return { collection: slug, canCreate: true, canRead: true, canUpdate: true, canDelete: true }
  })
  const globalPermissions: RoleGlobalPermissions = _globals.map((c) => {
    const slug = c as string
    return { global: slug, canCreate: true, canRead: true, canUpdate: true, canDelete: true }
  })

  await payload.create({
    collection: 'roles',
    data: {
      name: 'Admin',
      slug: ROLE_SLUG,
      description: 'Default Admin Access',
      isAdmin: true,
      permissions: { globals: globalPermissions, collections: collectionPermissions },
    },
  })
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  // Migration code
  await payload
    .find({
      collection: 'roles',
      limit: 1,
      where: {
        slug: { equals: ROLE_SLUG },
      },
    })
    .then(async (res) => {
      if (res.totalDocs > 0 && res.docs.length > 0 && res.docs) {
        const roleId = res.docs[0]?.id
        if (!roleId) return

        await payload.delete({ collection: 'roles', id: roleId })
        return
      }
    })
}

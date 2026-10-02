import type { CollectionAfterChangeHook } from 'payload'

const TENANT_DOC_COLLECTIONS = ['header', 'footer', 'theme', 'settings'] as const

export const createTenantDocs: CollectionAfterChangeHook = async ({ doc, operation, req }) => {
  if (operation !== 'create') return doc

  const tenantId = doc.id
  const userId = req.user?.id

  for (const slug of TENANT_DOC_COLLECTIONS) {
    try {
      const existing = await req.payload.find({
        collection: slug,
        where: { tenant: { equals: tenantId } },
        limit: 1,
        depth: 0,
        req,
      })

      if (existing.totalDocs === 0) {
        await req.payload.create({
          collection: slug,
          data: {
            tenant: tenantId,
          },
          // a brand-new tenant has nothing cached yet, and this also runs from scripts/seeds
          context: { disableRevalidate: true },
          req,
        })

        req.payload.logger.info({
          msg: `Created default ${slug} doc for tenant`,
          slug,
          tenantId,
          userId,
        })
      }
    } catch (error) {
      req.payload.logger.error({
        err: error,
        msg: `Failed to create ${slug} doc for tenant`,
        slug,
        tenantId,
        userId,
      })
      throw error
    }
  }

  return doc
}

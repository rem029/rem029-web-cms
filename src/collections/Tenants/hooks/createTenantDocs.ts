import type { CollectionAfterChangeHook } from 'payload'

const TENANT_DOC_COLLECTIONS = ['header', 'footer', 'theme', 'settings'] as const

const headingRichText = (heading: string) => ({
  root: {
    type: 'root',
    version: 1,
    direction: 'ltr' as const,
    format: '' as const,
    indent: 0,
    children: [
      {
        type: 'heading',
        tag: 'h2',
        version: 1,
        direction: 'ltr' as const,
        format: '' as const,
        indent: 0,
        children: [
          {
            type: 'text',
            text: heading,
            version: 1,
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
          },
        ],
      },
    ],
  },
})

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

  // a new business gets a published `home` page set as its homepage, so `/` works without
  // knowing about slugs. the seed writes its own home pages
  if (req.context?.skipHomePage) return doc

  try {
    const existing = await req.payload.find({
      collection: 'pages',
      where: {
        and: [{ tenant: { equals: tenantId } }, { slug: { equals: 'home' } }],
      },
      limit: 1,
      depth: 0,
      req,
    })

    if (existing.totalDocs === 0) {
      // afterChange gets the name in the request's locale
      const title = typeof doc.name === 'string' && doc.name ? doc.name : 'Home'
      const page = await req.payload.create({
        collection: 'pages',
        data: {
          _status: 'published',
          title,
          slug: 'home',
          // unlocked: a locked slug follows the title as soon as the page is opened in the admin
          slugLock: false,
          tenant: tenantId,
          hero: {
            main: {
              type: 'none',
            },
          },
          layout: [
            {
              blockType: 'content',
              columns: [
                {
                  size: 'full',
                  richText: headingRichText(`Welcome to ${title}`),
                },
              ],
            },
          ],
          publishedAt: new Date().toISOString(),
        },
        context: { disableRevalidate: true },
        req,
      })

      req.payload.logger.info({
        msg: 'Created default home page for tenant',
        pageId: page.id,
        tenantId,
        userId,
      })

      const settings = await req.payload.find({
        collection: 'settings',
        where: { tenant: { equals: tenantId } },
        limit: 1,
        depth: 0,
        req,
      })

      const settingsDoc = settings.docs[0]
      if (settingsDoc && !settingsDoc.homepage) {
        await req.payload.update({
          collection: 'settings',
          id: settingsDoc.id,
          data: {
            homepage: page.id,
          },
          context: { disableRevalidate: true },
          req,
        })

        req.payload.logger.info({
          msg: 'Set default homepage in settings for tenant',
          pageId: page.id,
          tenantId,
          userId,
        })
      }
    }
  } catch (error) {
    req.payload.logger.error({
      err: error,
      msg: 'Failed to create default home page for tenant',
      tenantId,
      userId,
    })
    throw error
  }

  return doc
}

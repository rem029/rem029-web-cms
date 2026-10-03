import type { CollectionBeforeValidateHook } from 'payload'
import { getAccessSlugs } from '../utils/accessSlugs'

export const defaultAccessRows: CollectionBeforeValidateHook = ({ data, req, operation }) => {
  if (
    operation === 'create' &&
    (!data?.access || !Array.isArray(data.access) || data.access.length === 0)
  ) {
    const collections = req?.payload?.config?.collections || []
    const slugs = getAccessSlugs(collections)
    const rows = slugs.map((slug) => ({
      slug,
      hidden: true,
      read: false,
      create: false,
      update: false,
      delete: false,
      admin: false,
      access: false,
    }))

    req.payload.logger.debug({
      msg: 'Filled default access rows for new users-access record',
      count: rows.length,
    })

    return {
      ...data,
      access: rows,
    }
  }

  return data
}

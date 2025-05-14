import type { CollectionBeforeChangeHook } from 'payload'

import type { Page } from '../../../payload-types'

export const populateFullSlug: CollectionBeforeChangeHook<Page> = ({ data, operation }) => {
  if (operation === 'create' || operation === 'update') {
    data.fullSlug = data?.slug || ''
  }

  return data
}

import type { GlobalConfig } from 'payload'

import { showcaseFields } from '@/common/fields/showcaseFields'
import { globalAccessResolver, hiddenResolver } from '@/common/utils/access'

const SLUG = 'field-showcase-global'

/**
 * The field showcase as a global (rem0005 phase 3 step 3): the global edit view (no list, its own
 * document bar, drafts on a global) is a surface the collection can't show. A global, not per
 * tenant: it's a dev page, nothing on the public site reads it. Profiles grant it (read / update
 * rows, any of the user's tenants); one row granting update lets that user edit the one
 * platform-wide doc, fine for a dev page. Not audited and no createdBy/updatedBy: both lists are
 * collection-only, and this is dev data.
 */
export const FieldShowcaseGlobal: GlobalConfig = {
  slug: SLUG,
  label: 'Field showcase (global)',
  admin: {
    group: 'Dev',
    hidden: hiddenResolver(SLUG),
  },
  versions: {
    drafts: true,
  },
  // drafts and versions set explicitly: left unset, Payload lets any signed-in user read them
  access: {
    read: globalAccessResolver(SLUG, 'read'),
    readDrafts: globalAccessResolver(SLUG, 'read'),
    readVersions: globalAccessResolver(SLUG, 'read'),
    update: globalAccessResolver(SLUG, 'update'),
  },
  // no tenant: the pickers list what the user can read
  fields: showcaseFields([
    { name: 'people', type: 'relationship', relationTo: 'users', hasMany: true },
    {
      name: 'related',
      label: 'Page or post',
      type: 'relationship',
      relationTo: ['pages', 'posts'],
    },
    { name: 'image', type: 'upload', relationTo: 'media' },
    { name: 'gallery', type: 'upload', relationTo: 'media', hasMany: true },
    {
      name: 'pageDrawer',
      label: 'Relationship (drawer)',
      type: 'relationship',
      relationTo: 'pages',
      admin: { appearance: 'drawer', description: 'Picks from a list in a side drawer.' },
    },
    {
      name: 'pagesDrawer',
      label: 'Relationship (drawer, has many)',
      type: 'relationship',
      relationTo: 'pages',
      hasMany: true,
      admin: { appearance: 'drawer' },
    },
  ]),
}

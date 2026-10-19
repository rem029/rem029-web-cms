import type { Payload, TypedUser } from 'payload'

import type { Tenant } from '@/payload-types'
import { getTenantURL } from '@/utilities/getURL'

import type { BuilderResult } from '../components/builderTypes'

const isPopulatedTenant = (tenant: unknown): tenant is Tenant =>
  typeof tenant === 'object' &&
  tenant !== null &&
  'slug' in tenant &&
  typeof tenant.slug === 'string'

/**
 * The guest address of a saved menu (rem0017 phase 3 step 5), shown in the menu's edit view so
 * editors can copy it (and, next, print it as a QR code). The menu is read as the user, latest
 * save first (a draft's slug counts), and the address is on the menu's own business host.
 */
export const getMenuPublicURL = async (
  payload: Payload,
  user: TypedUser,
  args: { id: number },
): Promise<BuilderResult<{ url: string }>> => {
  let menu
  try {
    menu = await payload.findByID({
      collection: 'menus',
      id: args.id,
      draft: true,
      depth: 1,
      user,
      overrideAccess: false,
      select: { slug: true, tenant: true },
    })
  } catch (err) {
    payload.logger.warn(
      { err, menuId: args.id, userId: user.id },
      'menu public url: menu not found',
    )
    return { ok: false, error: "This menu can't be found. Reload the page." }
  }

  if (!menu) {
    payload.logger.warn({ menuId: args.id, userId: user.id }, 'menu public url: menu not found')
    return { ok: false, error: "This menu can't be found. Reload the page." }
  }

  const tenant = menu.tenant
  const slug = menu.slug

  if (!isPopulatedTenant(tenant) || typeof slug !== 'string' || !slug.trim()) {
    return { ok: false, error: 'Give the menu a title and save it.' }
  }

  const url = `${getTenantURL(tenant)}/menu/${slug}`
  payload.logger.debug({ menuId: args.id, tenantId: tenant.id }, 'menu public url')
  return { ok: true, url }
}

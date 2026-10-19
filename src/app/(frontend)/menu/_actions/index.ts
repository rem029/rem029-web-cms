'use server'

import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { getFrontendTenantId } from '@/common/utils/frontendTenant'

import { toLocale } from '../_data/locale'
import { searchMenuItems, type GuestMenuItem } from '../_data/menuData'

export type SearchMenuResult = { ok: true; items: GuestMenuItem[] } | { ok: false; error: string }

/**
 * The menu page's search box (rem0017 phase 3, SearchOverlay): items on this menu matching the
 * query, in the visitor's locale. The tenant comes from the request's host, never from the
 * client; the menu id only narrows within that tenant. The error is a key the overlay shows in
 * the visitor's language.
 */
export const searchMenuItemsAction = async (args: {
  menuId: number
  query: string
  locale: string
}): Promise<SearchMenuResult> => {
  const payload = await getPayload({ config: configPromise })
  const menuId = Number(args?.menuId)
  const query = typeof args?.query === 'string' ? args.query : ''
  if (!Number.isInteger(menuId) || menuId <= 0) return { ok: true, items: [] }

  const tenantId = await getFrontendTenantId()
  try {
    const items = await searchMenuItems(payload, tenantId, menuId, query, toLocale(args?.locale))
    return { ok: true, items }
  } catch (err) {
    payload.logger.error({ msg: 'menu search failed', tenantId, menuId, err })
    return { ok: false, error: 'searchFailed' }
  }
}

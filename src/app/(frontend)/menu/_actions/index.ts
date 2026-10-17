'use server'

import configPromise from '@payload-config'
import { getPayload, type TypedLocale } from 'payload'

import { getFrontendTenantId } from '@/common/utils/frontendTenant'
import { SUPPORTED_LOCALES } from '@/utilities/constant'

import { searchMenuItems, type GuestMenuItem } from '../_data/menuData'

export type SearchMenuResult = { ok: true; items: GuestMenuItem[] } | { ok: false; error: string }

/**
 * The menu page's search box (rem0017 phase 3, SearchOverlay): items on this menu matching the
 * query, in the visitor's locale. The tenant comes from the request's host, never from the
 * client; the menu id only narrows within that tenant.
 */
export const searchMenuItemsAction = async (args: {
  menuId: number
  query: string
  locale: string
}): Promise<SearchMenuResult> => {
  // 1. validate: menuId a positive integer, query a string trimmed to 100 chars, locale one of
  //    SUPPORTED_LOCALES (else 'en') → TypedLocale
  // 2. payload = await getPayload; tenantId = await getFrontendTenantId()
  // 3. { ok: true, items: await searchMenuItems(payload, tenantId, menuId, query, locale) }
  // 4. on throw: payload.logger.error({ msg: 'menu search failed', tenantId, menuId, err }) →
  //    { ok: false, error: 'Search failed. Try again.' } (the overlay shows it in the locale)
  void args
  void configPromise
  void getPayload
  void getFrontendTenantId
  void SUPPORTED_LOCALES
  void searchMenuItems
  const locale: TypedLocale = 'en'
  void locale
  throw new Error('not implemented')
}

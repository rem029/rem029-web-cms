import type { Payload, TypedLocale } from 'payload'

/** The table a guest orders from, as the guest pages need it. */
export type OrderTable = {
  id: number
  slug: string
  label: string
}

/**
 * The table of a QR code (`?table=<slug>`) for a menu (rem0018): only an active table of that
 * tenant that lists that menu, else `null` (the guest then picks a table). Guests aren't users,
 * so it reads with `overrideAccess` and filters by the host's tenant itself; the caller resolved
 * the tenant from the host and the menu in that tenant.
 */
export const resolveOrderTable = async (
  payload: Payload,
  args: { tenantId: number; menuId: number; tableSlug: string; locale?: TypedLocale },
): Promise<OrderTable | null> => {
  if (!args.tableSlug || args.tableSlug.length > 120) {
    return null
  }

  const { docs } = await payload.find({
    collection: 'tables',
    where: {
      and: [
        { tenant: { equals: args.tenantId } },
        { slug: { equals: args.tableSlug } },
        { menus: { equals: args.menuId } },
        { isActive: { equals: true } },
      ],
    },
    depth: 0,
    overrideAccess: true,
    limit: 1,
    locale: args.locale,
  })

  const table = docs[0]
  if (!table) {
    payload.logger.debug(
      { tenantId: args.tenantId, menuId: args.menuId, slug: args.tableSlug },
      'resolve order table: not found',
    )
    return null
  }

  return {
    id: table.id,
    slug: table.slug ?? '',
    label: table.label,
  }
}

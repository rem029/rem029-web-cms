import type { DefaultServerCellComponentProps, Payload } from 'payload'
import { cache } from 'react'

import { DEFAULT_CURRENCY } from '@/collections/Settings/fields/currency'
import { formatPrice } from '@/common/utils/formatPrice'
import { extractTenantId } from '@/common/utils/tenantCollections'

// one settings read per tenant per request, not one per row; the currency is no secret
const tenantCurrency = cache(async (payload: Payload, tenantId: number): Promise<string> => {
  const { docs } = await payload.find({
    collection: 'settings',
    where: { tenant: { equals: tenantId } },
    limit: 1,
    depth: 0,
  })
  return docs[0]?.currency ?? DEFAULT_CURRENCY
})

/**
 * Price in the items list with the tenant's currency (Settings → Currency), e.g. "QAR 12.50".
 * A server cell: Payload renders list cells on the server and passes `payload`.
 */
export const PriceCell = async ({
  cellData,
  rowData,
  payload,
  i18n,
}: DefaultServerCellComponentProps): Promise<string | null> => {
  if (typeof cellData !== 'number') return null
  const tenantId = extractTenantId(rowData?.tenant)
  const currency = tenantId !== null ? await tenantCurrency(payload, tenantId) : DEFAULT_CURRENCY
  return formatPrice(cellData, currency, i18n.language)
}

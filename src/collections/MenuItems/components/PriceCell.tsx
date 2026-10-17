import type { DefaultServerCellComponentProps } from 'payload'
import React from 'react'

/**
 * Price in the items list with the tenant's currency (Settings → Currency), e.g. "QAR 12.50".
 * A server cell: Payload renders list cells on the server and passes `payload`.
 */
export const PriceCell = async (
  _props: DefaultServerCellComponentProps,
): Promise<React.ReactNode> => {
  // 1. no number in cellData → null
  // 2. tenantId = extractTenantId(rowData.tenant); currency = that tenant's settings.currency
  //    (one cached read per tenant per request: React cache), else DEFAULT_CURRENCY
  // 3. return formatPrice(cellData, currency, i18n.language)
  return null
}

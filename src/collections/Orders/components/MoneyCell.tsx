import type { DefaultServerCellComponentProps } from 'payload'

import { DEFAULT_CURRENCY } from '@/collections/Settings/fields/currency'
import { formatMinor } from '@/common/utils/money'

/** An order amount in the list, in the order's own currency (1800 → "$18.00"). */
export const MoneyCell = ({
  cellData,
  rowData,
  i18n,
}: DefaultServerCellComponentProps): string | null => {
  if (typeof cellData !== 'number') return null
  const currency = typeof rowData?.currency === 'string' ? rowData.currency : DEFAULT_CURRENCY
  return formatMinor(cellData, currency, i18n.language)
}

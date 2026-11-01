import type { DefaultServerCellComponentProps } from 'payload'

/** The list's Refund due column: the words only on a payment to refund, blank otherwise. */
export const RefundDueCell = ({ cellData }: DefaultServerCellComponentProps): string | null =>
  cellData === true ? 'Refund due' : null

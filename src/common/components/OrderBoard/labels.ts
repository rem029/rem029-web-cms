import type { StaffRole } from '@/common/utils/staffRoles'

/** The board names in the nav and on each board's heading (rem0018 phase 4). A plain module, so
 * the server view and the client nav links can both import it. */
export const BOARD_LABELS: Record<StaffRole, string> = {
  waiter: 'Waiter board',
  kitchen: 'Kitchen board',
  cashier: 'Cashier board',
}

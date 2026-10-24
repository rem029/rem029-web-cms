/**
 * Slugs for platform access templates.
 *
 * Templates are created and maintained via migrations (frozen data in SQL).
 * Later tasks (restaurant menu, POS, etc.) add their own templates with
 * their own migrations and add their slug constants here.
 */
export const PAGES_EDITOR_TEMPLATE = 'pages-editor'
export const PAGES_VIEWER_TEMPLATE = 'pages-viewer'

// rem0018 phase 1 step 2: restaurant staff, each opens the admin, reads menus and works its board
export const WAITER_TEMPLATE = 'waiter'
export const KITCHEN_TEMPLATE = 'kitchen'
export const CASHIER_TEMPLATE = 'cashier'

import { ValidationError, type CollectionBeforeChangeHook } from 'payload'

import { DEFAULT_CURRENCY } from '@/collections/Settings/fields/currency'
import type { MenuItem, Order } from '@/payload-types'
import { linePrice } from '@/common/utils/linePrice'
import { toMinor } from '@/common/utils/money'
import { tenantCurrency } from '@/common/utils/tenantCurrency'
import { extractTenantId } from '@/common/utils/tenantCollections'

type SnapshottedOrderLine = NonNullable<Order['items']>[number]
type SnapshottedOption = NonNullable<SnapshottedOrderLine['selectedOptions']>[number]

type OptionInfo = {
  groupName: string
  groupRequired: boolean
  groupInputType: 'checkbox' | 'radio'
  label: string
  price: number
}

/**
 * Fills a new order's prices, titles and totals from server data only (rem0018 phase 1 step 3a):
 * whatever the caller sent for `title`, `unitPrice`, the choices' `group` / `label` / `price`,
 * `lineTotal`, the totals, `currency`, `flow` and `showPrices` is overwritten. Refuses, with a
 * plain-words ValidationError on the line's path:
 * - an item that is not on the order's menu, inactive or out of stock
 * - a required choice group without a choice, or two choices in an "Exactly one" group
 * Unknown choice ids are dropped (logged at warn), not refused: a guest's cart may hold a choice
 * the editor removed since. Creates only; lines are fixed once placed.
 */
export const snapshotItems: CollectionBeforeChangeHook<Order> = async ({
  data,
  operation,
  req,
}) => {
  if (!data || operation !== 'create') {
    return data
  }

  const menuId = extractTenantId(data.menu)
  if (menuId === null) {
    throw new ValidationError({
      collection: 'orders',
      errors: [{ path: 'menu', message: 'Menu is required.' }],
      req,
    })
  }

  // disableErrors: a missing menu comes back as null instead of throwing NotFound
  const menu = await req.payload.findByID({
    collection: 'menus',
    id: menuId,
    draft: false,
    overrideAccess: true,
    req,
    depth: 0,
    disableErrors: true,
  })

  if (!menu) {
    req.payload.logger.warn({ msg: 'order: menu not found', menuId })
    throw new ValidationError({
      collection: 'orders',
      errors: [{ path: 'menu', message: 'Menu not found.' }],
      req,
    })
  }

  const menuItemIds = new Set<number>()
  if (Array.isArray(menu.items)) {
    for (const item of menu.items) {
      const id = extractTenantId(item)
      if (id !== null) {
        menuItemIds.add(id)
      }
    }
  }

  const tenantId = extractTenantId(data.tenant) ?? extractTenantId(menu.tenant)
  const currency = tenantId !== null ? await tenantCurrency(req.payload, tenantId) : DEFAULT_CURRENCY

  const rawLines = Array.isArray(data.items) ? data.items : []
  const requestedItemIds: number[] = []
  for (const line of rawLines) {
    const itemId = extractTenantId(line.item)
    if (itemId !== null && !requestedItemIds.includes(itemId)) {
      requestedItemIds.push(itemId)
    }
  }

  const { docs: foundItems } =
    requestedItemIds.length > 0
      ? await req.payload.find({
          collection: 'menu-items',
          where: { id: { in: requestedItemIds } },
          overrideAccess: true,
          req,
          depth: 0,
          pagination: false,
          locale: req.locale,
        })
      : { docs: [] }

  const itemsById = new Map<number, MenuItem>()
  for (const item of foundItems) {
    itemsById.set(item.id, item)
  }

  const snapshottedLines: SnapshottedOrderLine[] = []

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i]
    if (!line) continue

    const itemId = extractTenantId(line.item)
    const item = itemId !== null ? itemsById.get(itemId) : undefined

    if (!item || !menuItemIds.has(item.id) || item.isActive === false || item.inStock === false) {
      const title = item?.title ?? 'Item'
      throw new ValidationError({
        collection: 'orders',
        errors: [
          {
            path: `items.${i}.item`,
            message: `${title} is not available on this menu.`,
          },
        ],
        req,
      })
    }

    const optionsById = new Map<string, OptionInfo>()
    const modifierGroups = item.modifierGroups ?? []
    for (const group of modifierGroups) {
      for (const opt of group.options ?? []) {
        if (opt.id) {
          optionsById.set(opt.id, {
            groupName: group.name,
            groupRequired: group.required === true,
            groupInputType: group.inputType,
            label: opt.label,
            price: typeof opt.price === 'number' ? opt.price : 0,
          })
        }
      }
    }

    const rawOptions = Array.isArray(line.selectedOptions) ? line.selectedOptions : []
    const chosenOptions: SnapshottedOption[] = []
    const chosenByGroup = new Map<string, number>()

    for (const sel of rawOptions) {
      if (!sel || typeof sel.option !== 'string') continue
      const match = optionsById.get(sel.option)
      if (!match) {
        req.payload.logger.warn({
          msg: 'order: unknown choice dropped',
          itemId: item.id,
          option: sel.option,
        })
        continue
      }

      chosenOptions.push({
        ...(sel.id ? { id: sel.id } : {}),
        option: sel.option,
        group: match.groupName,
        label: match.label,
        price: toMinor(match.price, currency),
      })

      const count = chosenByGroup.get(match.groupName) ?? 0
      chosenByGroup.set(match.groupName, count + 1)
    }

    for (const group of modifierGroups) {
      const count = chosenByGroup.get(group.name) ?? 0
      if (group.required && count === 0) {
        throw new ValidationError({
          collection: 'orders',
          errors: [
            {
              path: `items.${i}.item`,
              message: `Choose a ${group.name} for ${item.title}.`,
            },
          ],
          req,
        })
      }
      if (group.inputType === 'radio' && count > 1) {
        throw new ValidationError({
          collection: 'orders',
          errors: [
            {
              path: `items.${i}.item`,
              message: `Choose one ${group.name} for ${item.title}.`,
            },
          ],
          req,
        })
      }
    }

    const unitPrice = toMinor(typeof item.price === 'number' ? item.price : 0, currency)
    const extras = chosenOptions.map((opt) => (typeof opt.price === 'number' ? opt.price : 0))
    const quantity = typeof line.quantity === 'number' && line.quantity > 0 ? line.quantity : 1
    const lineTotal = linePrice({ unitPrice, extras, quantity })

    snapshottedLines.push({
      ...(line.id ? { id: line.id } : {}),
      item: item.id,
      quantity,
      unitPrice,
      lineTotal,
      title: item.title,
      selectedOptions: chosenOptions,
    })
  }

  const total = snapshottedLines.reduce((sum, line) => sum + (line.lineTotal ?? 0), 0)

  return {
    ...data,
    items: snapshottedLines,
    subtotal: total,
    total,
    amountPaid: 0,
    balance: total,
    paymentStatus: 'unpaid',
    currency,
    flow: menu.ordering?.flow ?? null,
    showPrices: menu.ordering?.showPrices ?? null,
  }
}

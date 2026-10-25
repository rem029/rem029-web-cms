import type { CollectionConfig } from 'payload'

/**
 * Order counters (rem0018 phase 1 step 3a): the last order number per business and business day.
 * Internal: no access for anyone (super users included), hidden from the admin and from access
 * profiles; only `assignOrderNumber` writes it, with one atomic upsert. A counter nobody can edit
 * can't be rewound (sdq's counter on an editable doc could).
 */
export const OrderCounters: CollectionConfig = {
  slug: 'order-counters',
  access: {
    read: () => false,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  admin: { hidden: true },
  indexes: [{ fields: ['tenant', 'date'], unique: true }],
  fields: [
    // the tenant id as a plain number, not a relationship: a relationship's foreign key is `ON DELETE
    // SET NULL`, which a required column refuses, so deleting a business would fail. a deleted
    // business's counters stay behind, harmless (ids are never reused)
    { name: 'tenant', type: 'number', required: true },
    { name: 'date', type: 'text', required: true },
    { name: 'last', type: 'number', required: true, defaultValue: 0 },
  ],
}

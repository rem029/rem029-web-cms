import type { GroupField, Option } from 'payload'

import { getProvider, PROVIDERS } from '@/common/utils/payments/registry'

const optionValue = (option: Option): string => (typeof option === 'string' ? option : option.value)

/**
 * Settings → Payments (rem0018 phase 2 step 2): which provider lets guests pay from their phone.
 * `none` by default. Secrets stay in env, never here. The select lists every provider the code
 * knows (`PROVIDERS`, the same enum everywhere), and `filterOptions` hides the ones not available
 * in this process (the `test` provider outside dev), keeping the saved value so it still shows.
 */
export const onlinePaymentsField: GroupField = {
  name: 'onlinePayments',
  type: 'group',
  label: 'Online payments',
  fields: [
    {
      name: 'provider',
      type: 'select',
      label: 'Payment provider',
      defaultValue: 'none',
      options: [
        { label: 'None', value: 'none' },
        ...PROVIDERS.map((provider) => ({ label: provider.label, value: provider.key })),
      ],
      filterOptions: ({ options, siblingData }) => {
        const saved: unknown =
          siblingData && typeof siblingData === 'object' && 'provider' in siblingData
            ? siblingData.provider
            : null
        return options.filter((option) => {
          const value = optionValue(option)
          return value === 'none' || value === saved || getProvider(value) !== null
        })
      },
      admin: { description: 'Connect a payment provider to let guests pay from their phone.' },
    },
  ],
}

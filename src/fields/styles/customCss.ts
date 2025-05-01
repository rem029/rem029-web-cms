import { Field } from 'payload'

export const CustomCSS: Field[] = [
  { name: 'className', type: 'text', admin: { description: 'Custom class name' } },
  {
    name: 'customCSS',
    type: 'textarea',
    admin: {
      description: 'Custom CSS styles (without selectors)',
      placeholder: 'color: red; text-transform: uppercase;',
    },
  },
]

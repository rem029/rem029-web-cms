import { Field } from 'payload'

export const iconField: Field = {
  name: 'icon',
  label: 'Icon (Optional)',
  type: 'select',
  options: [
    { label: 'None', value: '' },
    { label: 'Person', value: 'person' },
    { label: 'Email', value: 'email' },
    { label: 'Phone', value: 'phone' },
    { label: 'Message / Text', value: 'message' },
    { label: 'Number', value: 'number' },
    { label: 'Select / Dropdown', value: 'select' },
    { label: 'Checkbox', value: 'checkbox' },
    { label: 'Location / Country / State', value: 'location' },
  ],
  admin: {
    description: 'Select an icon to display next to this field (frontend implementation required).',
  },
}

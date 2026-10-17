import type { Field, TextField } from 'payload'

/** Extra CSS classes on a field's wrapper, for the form's Custom CSS (Appearance tab). */
export const cssClassField: TextField = {
  name: 'css_class',
  type: 'text',
  label: 'CSS class',
  admin: {
    description: "Extra CSS classes for this field's wrapper, used by the form's Custom CSS.",
  },
}

/** Short hint shown under the input. */
export const helpTextField: Field = {
  name: 'help_text',
  type: 'text',
  label: 'Help text',
  localized: true,
}

/** name / label / width / required / help text / css class: the same on every custom input block. */
export const childFields: Field[] = [
  {
    type: 'row',
    fields: [
      {
        name: 'name',
        type: 'text',
        label: 'Name (lowercase, no special characters)',
        required: true,
        admin: { width: '50%' },
      },
      {
        name: 'label',
        type: 'text',
        label: 'Label',
        localized: true,
        admin: { width: '50%' },
      },
    ],
  },
  {
    type: 'row',
    fields: [
      {
        name: 'width',
        type: 'number',
        label: 'Field width (percentage)',
        admin: { width: '50%' },
      },
      {
        name: 'required',
        type: 'checkbox',
        label: 'Required',
        admin: { width: '50%' },
      },
    ],
  },
  helpTextField,
  cssClassField,
]

import { Field } from 'payload'

export const CustomCSSField: Field = {
  name: 'css',
  type: 'code',
  label: 'Custom CSS',
  _sanitized: true,
  admin: {
    language: 'css',
  },
}

export const CssNameField: Field = {
  name: 'css',
  type: 'text',
  label: 'CSS names',
  _sanitized: true,
  admin: {
    description:
      'Add CSS class names to the element. These will be added to the element as a class attribute. You can use this to add custom styles to the element.',
  },
}

export const CSSNameWithCustomFiled: Field[] = [CssNameField, CustomCSSField]

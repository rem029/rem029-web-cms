import { Field } from 'payload'

export const CustomCSSField: Field = {
  name: 'css_style',
  type: 'code',
  label: 'Custom CSS',
  _sanitized: true,
  admin: {
    language: 'css',
  },
}

export const CssNameField: Field = {
  name: 'css_name',
  type: 'text',
  label: 'CSS names',
  _sanitized: true,
  admin: {
    description:
      'Add CSS class names to the element. These will be added to the element as a class attribute. You can use this to add custom styles to the element.',
  },
}

export const CSSNameWithCustomFiled: Field[] = [CssNameField, CustomCSSField]
export const getStyles = (styles: {
  css_style?: string | null | undefined
  css_name?: string | null | undefined
}) => {
  return { cssStyle: styles?.css_style || '', cssName: styles?.css_name || '' }
}

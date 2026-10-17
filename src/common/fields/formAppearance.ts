import type { Field, Tab } from 'payload'

/** The stable class names a form's Custom CSS can target (also listed in the field description). */
export const FORM_CSS_HOOKS = [
  'fb-form',
  'fb-body',
  'fb-header',
  'fb-steps',
  'fb-step',
  'fb-step--active',
  'fb-progress',
  'fb-field',
  'fb-field--<type>',
  'fb-field--error',
  'fb-label',
  'fb-input',
  'fb-help',
  'fb-error',
  'fb-error-summary',
  'fb-choice',
  'fb-group',
  'fb-list',
  'fb-list-row',
  'fb-conditional',
  'fb-content',
  'fb-review',
  'fb-actions',
  'fb-button',
  'fb-button--primary',
  'fb-confirmation',
] as const

const select = (
  name: string,
  label: string,
  defaultValue: string,
  options: [value: string, label: string][],
): Field => ({
  name,
  type: 'select',
  label,
  defaultValue,
  options: options.map(([value, optionLabel]) => ({ value, label: optionLabel })),
})

/**
 * How the form looks: presets with defaults that follow the tenant theme, so a new form looks
 * right with no choices. The renderer (phase 2) maps them to data attributes and CSS variables.
 */
export const appearanceField: Field = {
  name: 'appearance',
  type: 'group',
  label: false,
  fields: [
    {
      type: 'row',
      fields: [
        select('width', 'Form width', 'medium', [
          ['narrow', 'Narrow'],
          ['medium', 'Medium'],
          ['wide', 'Wide'],
          ['full', 'Full width'],
        ]),
        select('card', 'Container', 'card', [
          ['plain', 'Plain'],
          ['card', 'Card'],
        ]),
        select('density', 'Spacing', 'comfortable', [
          ['comfortable', 'Comfortable'],
          ['compact', 'Compact'],
        ]),
      ],
    },
    {
      type: 'row',
      fields: [
        select('field_style', 'Field style', 'outlined', [
          ['outlined', 'Outlined'],
          ['filled', 'Filled'],
          ['underlined', 'Underlined'],
        ]),
        select('label_position', 'Labels', 'above', [
          ['above', 'Above the field'],
          ['floating', 'Inside the field (floating)'],
          ['inline', 'Beside the field (desktop)'],
        ]),
        select('radius', 'Corners', 'medium', [
          ['none', 'Square'],
          ['small', 'Slightly rounded'],
          ['medium', 'Rounded'],
          ['large', 'Very rounded'],
          ['pill', 'Pill'],
        ]),
      ],
    },
    {
      type: 'row',
      fields: [
        select('button_style', 'Buttons', 'solid', [
          ['solid', 'Solid'],
          ['outline', 'Outline'],
        ]),
        {
          name: 'button_full_width',
          type: 'checkbox',
          label: 'Full-width buttons',
          defaultValue: false,
        },
        select('step_indicator', 'Step indicator (multi-step)', 'progress', [
          ['progress', 'Progress bar'],
          ['numbered', 'Numbered steps'],
          ['dots', 'Dots'],
          ['none', 'None'],
        ]),
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'accent_color',
          type: 'text',
          label: 'Accent colour',
          admin: {
            description: "Optional, e.g. #0f766e. Empty uses the site theme's primary colour.",
          },
          validate: (value: unknown) => validateHexColor(value),
        },
        {
          name: 'background_image',
          type: 'upload',
          relationTo: 'media',
          label: 'Background image',
        },
        select('background_overlay', 'Background overlay', 'none', [
          ['none', 'None'],
          ['light', 'Light'],
          ['dark', 'Dark'],
        ]),
      ],
    },
  ],
}

/** Free-form CSS for this form only: the escape hatch when the presets aren't enough. */
export const customCssField: Field = {
  name: 'custom_css',
  type: 'code',
  label: 'Custom CSS',
  admin: {
    language: 'css',
    description: `Applies to this form only. Target its parts with: ${FORM_CSS_HOOKS.join(', ')}, a field's "CSS class", or [data-field="<name>"].`,
  },
}

/** Hex colour (#rgb or #rrggbb) or empty. */
export const validateHexColor = (value: unknown): true | string => {
  if (value === null || value === undefined || value === '') return true
  if (typeof value === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) return true
  return 'Use a hex colour like #0f766e.'
}

/** The Appearance tab on forms. */
export const appearanceTab: Tab = {
  label: 'Appearance',
  fields: [appearanceField, customCssField],
}

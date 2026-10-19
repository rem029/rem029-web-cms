import type { CodeFieldValidation, Field, TextFieldSingleValidation } from 'payload'

/**
 * How a menu's page looks (rem0017 phase 2): simple fields instead of a block layout, like the
 * survey-doha-quest event page. The guest page (phase 3) reads them directly. Defaults are the
 * common case, so a new menu needs no choices here.
 */

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/

// longest custom css a menu may have, in characters
const CUSTOM_CSS_MAX = 20000

const validateCustomCss: CodeFieldValidation = (value) =>
  !value || value.length <= CUSTOM_CSS_MAX
    ? true
    : `Custom CSS can be at most ${CUSTOM_CSS_MAX} characters. Move shared styles to the Theme.`

// empty is fine (the tenant theme is used); anything else must be #RRGGBB
const validateColor: TextFieldSingleValidation = (value) =>
  !value || HEX_COLOR.test(value) ? true : 'Use a colour like #1d4ed8, or leave it empty.'

const colorField = (name: string, label: string): Field => ({
  name,
  type: 'text',
  label,
  validate: validateColor,
  admin: { width: '25%', placeholder: '#1d4ed8' },
})

export const pageFields: Field[] = [
  {
    name: 'header',
    type: 'group',
    label: 'Header',
    fields: [
      {
        type: 'row',
        fields: [
          {
            name: 'title',
            type: 'text',
            label: 'Header title',
            localized: true,
            admin: {
              width: '50%',
              description: 'The big title at the top. Leave empty to use the menu title.',
            },
          },
          {
            name: 'logo',
            type: 'upload',
            relationTo: 'media',
            label: 'Logo',
            admin: {
              width: '50%',
              description: 'Leave empty to use the logo from Settings.',
            },
          },
        ],
      },
      {
        name: 'showLanguageSwitch',
        type: 'checkbox',
        label: 'Show the English / Arabic switch',
        defaultValue: true,
      },
    ],
  },
  {
    name: 'carousel',
    type: 'array',
    label: 'Carousel images',
    labels: { singular: 'Image', plural: 'Images' },
    admin: {
      description: 'Optional photos shown under the header. Leave empty for no carousel.',
      initCollapsed: true,
    },
    fields: [{ name: 'image', type: 'upload', relationTo: 'media', required: true }],
  },
  {
    name: 'intro',
    type: 'group',
    label: 'Intro',
    fields: [
      {
        type: 'row',
        fields: [
          {
            name: 'heading',
            type: 'text',
            label: 'Heading',
            localized: true,
            admin: { width: '50%' },
          },
          {
            name: 'subheading',
            type: 'text',
            label: 'Subheading',
            localized: true,
            admin: { width: '50%' },
          },
        ],
      },
    ],
  },
  {
    name: 'filters',
    type: 'group',
    label: 'Search and filters',
    fields: [
      {
        type: 'row',
        fields: [
          { name: 'showSearch', type: 'checkbox', label: 'Search', defaultValue: true },
          {
            name: 'showAllergens',
            type: 'checkbox',
            label: 'Allergen filter',
            defaultValue: false,
          },
          {
            name: 'showAvailability',
            type: 'checkbox',
            label: 'Breakfast / lunch / dinner filter',
            defaultValue: false,
          },
        ],
      },
    ],
  },
  {
    name: 'colors',
    type: 'group',
    label: 'Colours',
    admin: {
      description: "Leave empty to use your site's theme. Set them to give this menu its own look.",
    },
    fields: [
      {
        type: 'row',
        fields: [
          colorField('primary', 'Primary'),
          colorField('background', 'Background'),
          colorField('card', 'Cards'),
          colorField('text', 'Text'),
        ],
      },
    ],
  },
  // the escape hatch, not the main UX: collapsed at the end of the tab (rem0017 phase 3 step 6)
  {
    type: 'collapsible',
    label: 'Custom CSS',
    admin: { initCollapsed: true },
    fields: [
      {
        // one value, not localized: editor-only
        name: 'customCss',
        type: 'code',
        label: 'Custom CSS',
        validate: validateCustomCss,
        admin: {
          language: 'css',
          description:
            "Styles for this menu's page only. Target the menu-* class names, for example .menu-card-title { font-size: 2rem; }",
        },
      },
    ],
  },
]

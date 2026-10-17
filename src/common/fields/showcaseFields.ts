import type { Field } from 'payload'

import { ShowcaseCallout, ShowcaseQuote } from './showcaseBlocks'

const fruitOptions = [
  'Apple',
  'Banana',
  'Cherry',
  'Date',
  'Elderberry',
  'Fig',
  'Grape',
  'Honeydew',
  'Kiwi',
  'Lemon',
  'Mango',
  'Nectarine',
].map((label) => ({ label, value: label.toLowerCase() }))

/**
 * The field showcase's fields (rem0005), shared by the `field-showcase` collection and the
 * `field-showcase-global` global: one field of every Payload type, plus the states that render
 * differently (required, read-only, localized, conditional, hasMany, named tab, sidebar), so the
 * admin theme can be checked in one place. The Relations tab is each config's own (`relations`):
 * the collection's pickers stay in the doc's tenant and it has a join, the global has neither.
 * `point` is left out: it needs PostGIS, which CI's postgres:16 and staging don't have.
 */
export const showcaseFields = (relations: Field[]): Field[] => [
  {
    name: 'banner',
    type: 'ui',
    admin: {
      components: {
        Field: '@/common/components/ShowcaseBanner/ShowcaseBanner#ShowcaseBanner',
      },
    },
  },
  { name: 'title', type: 'text', required: true },
  {
    type: 'tabs',
    tabs: [
      {
        label: 'Text',
        fields: [
          {
            name: 'text',
            type: 'text',
            admin: { placeholder: 'Type something…', description: 'A plain text field.' },
          },
          { name: 'textMany', label: 'Text (has many)', type: 'text', hasMany: true },
          {
            name: 'textLocalized',
            label: 'Text (localized)',
            type: 'text',
            localized: true,
            admin: { description: 'Switch the locale at the top to edit the Arabic value.' },
          },
          {
            name: 'textReadOnly',
            label: 'Text (read-only)',
            type: 'text',
            defaultValue: 'You can read this but not change it',
            admin: { readOnly: true },
          },
          { name: 'textarea', type: 'textarea' },
          { name: 'email', type: 'email' },
          {
            name: 'number',
            type: 'number',
            min: 0,
            max: 100,
            admin: { description: 'Between 0 and 100: try 150 to see the error state.' },
          },
          { name: 'numberMany', label: 'Number (has many)', type: 'number', hasMany: true },
          { name: 'code', type: 'code', admin: { language: 'typescript' } },
          { name: 'json', type: 'json' },
        ],
      },
      {
        label: 'Choice',
        fields: [
          { name: 'checkbox', type: 'checkbox' },
          {
            name: 'showMore',
            label: 'Show the conditional field',
            type: 'checkbox',
          },
          {
            name: 'conditional',
            label: 'Conditional text',
            type: 'text',
            admin: { condition: (_, siblingData) => Boolean(siblingData?.showMore) },
          },
          {
            name: 'selectSingle',
            label: 'Select',
            type: 'select',
            admin: { isClearable: true },
            options: [
              { label: 'Small', value: 'small' },
              { label: 'Medium', value: 'medium' },
              { label: 'Large', value: 'large' },
            ],
          },
          {
            name: 'selectMany',
            label: 'Select (has many)',
            type: 'select',
            hasMany: true,
            options: [
              { label: 'Red', value: 'red' },
              { label: 'Green', value: 'green' },
              { label: 'Blue', value: 'blue' },
            ],
          },
          {
            name: 'selectLong',
            label: 'Select (long list)',
            type: 'select',
            options: fruitOptions,
          },
          {
            name: 'radio',
            type: 'radio',
            options: [
              { label: 'Morning', value: 'morning' },
              { label: 'Afternoon', value: 'afternoon' },
              { label: 'Evening', value: 'evening' },
            ],
          },
          {
            name: 'radioHorizontal',
            label: 'Radio (horizontal)',
            type: 'radio',
            admin: { layout: 'horizontal' },
            options: [
              { label: 'Yes', value: 'yes' },
              { label: 'No', value: 'no' },
              { label: 'Maybe', value: 'maybe' },
            ],
          },
        ],
      },
      {
        label: 'Dates',
        fields: [
          {
            name: 'dateTime',
            label: 'Day and time',
            type: 'date',
            admin: { date: { pickerAppearance: 'dayAndTime' } },
          },
          {
            name: 'dateDay',
            label: 'Day only',
            type: 'date',
            admin: { date: { pickerAppearance: 'dayOnly' } },
          },
          {
            name: 'dateMonth',
            label: 'Month only',
            type: 'date',
            admin: { date: { pickerAppearance: 'monthOnly' } },
          },
          {
            name: 'dateTimeOnly',
            label: 'Time only',
            type: 'date',
            admin: { date: { pickerAppearance: 'timeOnly' } },
          },
        ],
      },
      {
        label: 'Relations',
        fields: relations,
      },
      {
        label: 'Content',
        fields: [
          { name: 'richText', type: 'richText' },
          { name: 'layout', type: 'blocks', blocks: [ShowcaseCallout, ShowcaseQuote] },
        ],
      },
      {
        label: 'Layout',
        fields: [
          {
            name: 'items',
            type: 'array',
            minRows: 1,
            fields: [
              { name: 'label', type: 'text', required: true },
              { name: 'done', type: 'checkbox' },
            ],
          },
          {
            name: 'meta',
            type: 'group',
            fields: [
              { name: 'note', type: 'text' },
              {
                name: 'level',
                type: 'select',
                options: [
                  { label: 'Low', value: 'low' },
                  { label: 'High', value: 'high' },
                ],
              },
              {
                name: 'links',
                type: 'array',
                fields: [{ name: 'url', type: 'text', required: true }],
              },
            ],
          },
          {
            type: 'row',
            fields: [
              { name: 'firstName', type: 'text', admin: { width: '50%' } },
              { name: 'lastName', type: 'text', admin: { width: '50%' } },
            ],
          },
          {
            type: 'collapsible',
            label: 'Collapsible (open)',
            fields: [{ name: 'openNote', type: 'textarea' }],
          },
          {
            type: 'collapsible',
            label: 'Collapsible (closed)',
            admin: { initCollapsed: true },
            fields: [{ name: 'closedNote', type: 'textarea' }],
          },
        ],
      },
      {
        // a named tab stores its fields under its name, like a group
        name: 'namedTab',
        label: 'Named tab',
        fields: [
          {
            name: 'note',
            type: 'text',
            admin: { description: 'Saved as namedTab.note: a tab with a name works like a group.' },
          },
        ],
      },
    ],
  },
  {
    // not `status`: its enum name would clash with the drafts' `_status` enum
    name: 'stage',
    type: 'select',
    defaultValue: 'idea',
    options: [
      { label: 'Idea', value: 'idea' },
      { label: 'In review', value: 'review' },
      { label: 'Done', value: 'done' },
    ],
    admin: { position: 'sidebar' },
  },
  { name: 'featured', type: 'checkbox', admin: { position: 'sidebar' } },
  {
    name: 'reviewedAt',
    label: 'Reviewed at',
    type: 'date',
    admin: { position: 'sidebar' },
  },
  // enough sidebar fields to overflow the floating sidebar panel, so its own scroll can be checked
  {
    name: 'priority',
    type: 'number',
    min: 1,
    max: 5,
    admin: { position: 'sidebar', description: 'From 1 (low) to 5 (urgent).' },
  },
  {
    name: 'visibility',
    type: 'radio',
    defaultValue: 'team',
    options: [
      { label: 'Only me', value: 'me' },
      { label: 'My team', value: 'team' },
      { label: 'Everyone', value: 'everyone' },
    ],
    admin: { position: 'sidebar' },
  },
  {
    name: 'labels',
    type: 'select',
    hasMany: true,
    options: fruitOptions,
    admin: { position: 'sidebar', description: 'A long list, to check the menu in the panel.' },
  },
  { name: 'reviewer', type: 'relationship', relationTo: 'users', admin: { position: 'sidebar' } },
  { name: 'owner', type: 'text', admin: { position: 'sidebar' } },
  { name: 'summary', type: 'textarea', admin: { position: 'sidebar' } },
  {
    name: 'remindAt',
    label: 'Remind at',
    type: 'date',
    admin: { position: 'sidebar', date: { pickerAppearance: 'dayAndTime' } },
  },
]

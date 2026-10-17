/** Form docs for the renderer tests, as the page hands them over (populated, one locale). */
import { vi } from 'vitest'

import type { FormField, SubmitHandler, UploadHandler } from '@/components/FormRenderer/types'
import type { Form } from '@/payload-types'

const paragraph = (text: string): NonNullable<Form['confirmationMessage']> => ({
  root: {
    type: 'root',
    version: 1,
    direction: 'ltr',
    format: '',
    indent: 0,
    children: [{ type: 'paragraph', version: 1, children: [{ type: 'text', text, version: 1 }] }],
  },
})

/** A saved form with `fields`, in English unless overridden. */
export const formDoc = (fields: FormField[], overrides: Partial<Form> = {}): Form => ({
  id: 1,
  title: 'Test form',
  fields,
  submitButtonLabel: 'Send',
  confirmationType: 'message',
  confirmationMessage: paragraph('Thanks!'),
  createdAt: '2026-10-17T00:00:00.000Z',
  updatedAt: '2026-10-17T00:00:00.000Z',
  ...overrides,
})

/** One of each plugin stock field (the fields old pages already use). */
export const stockFields = (): FormField[] => [
  { blockType: 'text', name: 'full_name', label: 'Full name' },
  { blockType: 'textarea', name: 'about', label: 'About you' },
  { blockType: 'email', name: 'email', label: 'Email' },
  { blockType: 'number', name: 'guests', label: 'Guests' },
  {
    blockType: 'select',
    name: 'topic',
    label: 'Topic',
    options: [
      { label: 'Booking', value: 'booking' },
      { label: 'Other', value: 'other' },
    ],
  },
  {
    blockType: 'radio',
    name: 'seating',
    label: 'Seating',
    options: [
      { label: 'Inside', value: 'inside' },
      { label: 'Outside', value: 'outside' },
    ],
  },
  { blockType: 'checkbox', name: 'newsletter', label: 'Newsletter' },
  { blockType: 'date', name: 'visit', label: 'Visit date' },
  { blockType: 'country', name: 'country', label: 'Country' },
  { blockType: 'state', name: 'state', label: 'State' },
  { blockType: 'message', message: paragraph('Fields marked * are required.') },
]

/** A radio `party` (alone | family) and a required `family_note` shown when it's family. */
export const conditionalFields = (): FormField[] => [
  {
    blockType: 'radio',
    name: 'party',
    label: 'Coming with',
    options: [
      { label: 'Alone', value: 'alone' },
      { label: 'Family', value: 'family' },
    ],
  },
  {
    blockType: 'conditional',
    condition_field: 'party',
    operator: 'equal',
    value: 'family',
    fields: [{ blockType: 'text', name: 'family_note', label: 'Family note', required: true }],
  },
]

/** A list `family` (max_items 2) with a text `name`. */
export const listFields = (): FormField[] => [
  {
    blockType: 'list',
    name: 'family',
    label: 'Family',
    max_items: 2,
    fields: [{ blockType: 'text', name: 'name', label: 'Name' }],
  },
]

/** A two-step form: step "You" (required text `full_name`), step "Visit" (date `visit_date`). */
export const twoStepFields = (): FormField[] => [
  {
    blockType: 'multi-step',
    steps: [
      {
        label: 'You',
        fields: [{ blockType: 'text', name: 'full_name', label: 'Full name', required: true }],
      },
      { label: 'Visit', fields: [{ blockType: 'date', name: 'visit_date', label: 'Visit date' }] },
    ],
  },
]

/** A submit that resolves ok and records its calls. */
export const fakeSubmit = () => vi.fn<SubmitHandler>(async () => ({ ok: true }))

/** An upload that resolves with id 1. */
export const fakeUpload = () => vi.fn<UploadHandler>(async () => ({ ok: true, id: 1 }))

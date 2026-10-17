'use client'
/**
 * Renders a list of form fields and recurses into the containers:
 * - group → `<fieldset className="fb-group">` + legend, children under prefix `name.`
 * - list → `fb-list` with one `fb-list-row` per row (prefix `name.<i>.`), add / remove buttons,
 *   at most `max_items` rows, at least one
 * - conditional → its fields only while `evaluateCondition` matches (same prefix)
 * - message / image → `content.tsx`; anything else → `FieldControl` (fields.tsx)
 * Used by `FormRenderer` (single page) and `MultiStep` (one step at a time).
 */
import React from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/utilities/ui'

import { ImageContent, MessageContent } from './content'
import { useFormRenderer } from './context'
import { FieldControl } from './fields'
import { evaluateCondition, fieldPath } from './helpers'
import { formText } from './i18n'
import type { FieldOf, RenderField } from './types'

export type RecursiveFieldsProps = {
  fields: RenderField[]
  /** Dotted path prefix: '' at the top, `address.` in a group, `family.0.` in a list row. */
  prefix?: string
}

export const RecursiveFields: React.FC<RecursiveFieldsProps> = ({ fields, prefix = '' }) => (
  // step 2: CHANGE — gap-4 → var(--fb-gap) in formRenderer.css; group / list borders and padding move there too
  <div className="fb-fields flex flex-wrap gap-4">
    {fields.map((field, i) => (
      <FieldNode field={field} key={field.id ?? i} prefix={prefix} />
    ))}
  </div>
)

const FieldNode: React.FC<{ field: RenderField; prefix: string }> = ({ field, prefix }) => {
  const { values } = useFormRenderer()

  switch (field.blockType) {
    case 'message':
      return <MessageContent block={field} />
    case 'image':
      return <ImageContent block={field} />
    case 'group':
      return (
        <fieldset
          className={cn('fb-group basis-full rounded border border-border p-4', field.css_class)}
          data-field={fieldPath(prefix, field.name)}
        >
          {field.label && (
            <legend className="fb-group-label px-1 text-base font-semibold">{field.label}</legend>
          )}
          {field.help_text && (
            <p className="fb-help mb-3 text-sm text-muted-foreground">{field.help_text}</p>
          )}
          <RecursiveFields fields={field.fields ?? []} prefix={`${prefix}${field.name}.`} />
        </fieldset>
      )
    case 'list':
      return <ListField field={field} prefix={prefix} />
    case 'conditional':
      if (!evaluateCondition(field, values, prefix)) return null
      return (
        <div className={cn('fb-conditional basis-full', field.css_class)}>
          <RecursiveFields fields={field.fields ?? []} prefix={prefix} />
        </div>
      )
    case 'multi-step':
      // only valid as the form's top field, which FormRenderer hands to MultiStep
      return null
    default:
      return <FieldControl field={field} prefix={prefix} />
  }
}

const ListField: React.FC<{ field: FieldOf<'list'>; prefix: string }> = ({ field, prefix }) => {
  const { listCounts, addListRow, removeListRow, disabled, locale } = useFormRenderer()
  const text = formText(locale)
  const path = fieldPath(prefix, field.name)
  const rows = listCounts[path] ?? 1
  const label = field.label || field.name
  const full = Boolean(field.max_items && rows >= field.max_items)

  return (
    <fieldset
      className={cn('fb-list basis-full rounded border border-border p-4', field.css_class)}
      data-field={path}
    >
      <legend className="fb-group-label px-1 text-base font-semibold">{label}</legend>
      {field.help_text && (
        <p className="fb-help mb-3 text-sm text-muted-foreground">{field.help_text}</p>
      )}
      <div className="flex flex-col gap-6">
        {Array.from({ length: rows }, (_, row) => (
          <div className="fb-list-row flex flex-col gap-3" key={row}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-muted-foreground">
                {text.row(label, row + 1)}
              </p>
              {rows > 1 && (
                <Button
                  className="fb-button"
                  disabled={disabled}
                  onClick={() => removeListRow(path, row)}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  {text.removeRow(label, row + 1)}
                </Button>
              )}
            </div>
            <RecursiveFields fields={field.fields ?? []} prefix={`${path}.${row}.`} />
          </div>
        ))}
      </div>
      <Button
        className="fb-button mt-4"
        disabled={disabled || full}
        onClick={() => addListRow(path)}
        type="button"
        variant="outline"
      >
        {text.addRow(label)}
      </Button>
    </fieldset>
  )
}

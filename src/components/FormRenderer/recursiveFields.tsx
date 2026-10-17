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
  <div className="fb-fields">
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
          className={cn('fb-group', field.css_class)}
          data-field={fieldPath(prefix, field.name)}
        >
          {field.label && <legend className="fb-group-label">{field.label}</legend>}
          {field.help_text && <p className="fb-help">{field.help_text}</p>}
          <RecursiveFields fields={field.fields ?? []} prefix={`${prefix}${field.name}.`} />
        </fieldset>
      )
    case 'list':
      return <ListField field={field} prefix={prefix} />
    case 'conditional':
      if (!evaluateCondition(field, values, prefix)) return null
      return (
        <div className={cn('fb-conditional', field.css_class)}>
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
    <fieldset className={cn('fb-list', field.css_class)} data-field={path}>
      <legend className="fb-group-label">{label}</legend>
      {field.help_text && <p className="fb-help">{field.help_text}</p>}
      <div className="fb-list-rows">
        {Array.from({ length: rows }, (_, row) => (
          <div className="fb-list-row" key={row}>
            <div className="fb-list-row-head">
              <p className="fb-list-row-title">{text.row(label, row + 1)}</p>
              {rows > 1 && (
                <button
                  className="fb-button fb-button--quiet"
                  disabled={disabled}
                  onClick={() => removeListRow(path, row)}
                  type="button"
                >
                  {text.removeRow(label, row + 1)}
                </button>
              )}
            </div>
            <RecursiveFields fields={field.fields ?? []} prefix={`${path}.${row}.`} />
          </div>
        ))}
      </div>
      <button
        className="fb-button fb-list-add"
        disabled={disabled || full}
        onClick={() => addListRow(path)}
        type="button"
      >
        {text.addRow(label)}
      </button>
    </fieldset>
  )
}

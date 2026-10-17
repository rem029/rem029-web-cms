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

import type { RenderField } from './types'

export type RecursiveFieldsProps = {
  fields: RenderField[]
  /** Dotted path prefix: '' at the top, `address.` in a group, `family.0.` in a list row. */
  prefix?: string
  /** Sequence numbers by block id, when the form has `show_sequence_number`. */
  indices?: Record<string, number>
}

export const RecursiveFields: React.FC<RecursiveFieldsProps> = () => {
  // 1. const { values, listCounts, setListCount, locale } = useFormRenderer()
  // 2. <div className="fb-fields"> (flex-wrap; widths come from each field)
  // 3. per field, by blockType:
  //    message → <MessageContent>; image → <ImageContent>
  //    group → fieldset.fb-group + legend label → <RecursiveFields prefix={`${prefix}${name}.`}>
  //    list → count = listCounts[path] ?? 1; rows 0..count-1 → div.fb-list-row with
  //           "row n" heading + <RecursiveFields prefix={`${path}.${i}.`}>;
  //           "add <label>" (disabled at max_items) → setListCount(path, count + 1);
  //           "remove" on the last row (hidden at 1) → setListCount(path, count - 1)
  //    conditional → evaluateCondition ? <div className={cn('fb-conditional', css_class)}>
  //                  <RecursiveFields same prefix> : null
  //    else → <FieldControl field prefix index>
  return <div />
}

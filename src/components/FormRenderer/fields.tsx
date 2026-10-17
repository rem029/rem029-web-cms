'use client'
/**
 * One input per answer field type: the plugin's stock fields (text, textarea, email, number,
 * select, radio, checkbox, date, country, state) and ours (phone, time, rating, scale, file,
 * signature). Rendered by `RecursiveFields`; reads and writes answers through
 * `useFormRenderer()`. Built on `src/components/ui` primitives and theme tokens.
 *
 * Custom CSS contract: the wrapper is `fb-field fb-field--<blockType>` (+ `fb-field--error`)
 * with `data-field="<path>"` and the field's own `css_class`; inside it `fb-label`, `fb-input`,
 * `fb-help`, `fb-error`. `width` (percent) sets the wrapper's basis; full width on phones.
 */
import React from 'react'

import type { RenderField } from './types'

export type FieldControlProps = {
  field: RenderField
  /** Dotted path prefix of the enclosing group or list row: '' or `family.0.`. */
  prefix: string
  /** Sequence number shown before the label when the form has `show_sequence_number`. */
  index?: number
}

/** The wrapper every input shares: label (+ required mark), help text, error, width. */
export const FieldShell: React.FC<
  FieldControlProps & { path: string; inputId: string; children: React.ReactNode }
> = () => {
  // 1. <div className={cn('fb-field', `fb-field--${blockType}`, error && 'fb-field--error', css_class)}
  //      data-field={path} style basis from width>
  // 2. <label className="fb-label" htmlFor={inputId}>{index}. {label} {required && '*' + sr-only}
  // 3. children (the input, with className fb-input, aria-invalid, aria-describedby help/error)
  // 4. help_text → <p className="fb-help" id=…>; error → <p className="fb-error" role="alert" id=…>
  return <div />
}

export const FieldControl: React.FC<FieldControlProps> = () => {
  // 1. path = fieldPath(prefix, name); value = values[path]; error = errors[path]
  // 2. switch on blockType:
  //    text / email / phone (type=tel, dir=ltr) / number / date / time → <Input type=…>
  //    textarea → <textarea>
  //    select / country / state → <select> with options (country/state from the old block's lists)
  //    radio → radio group, `direction` row|column, role=radiogroup
  //    checkbox → <Checkbox> boolean
  //    rating → point_count buttons (stars|buttons), aria-label from labels[i], arrow keys move
  //    scale → buttons min..max by step with min_label / max_label at the ends
  //    file → <input type=file accept=FORM_UPLOAD_MIME_TYPES>; upload() → store the id;
  //           over FORM_UPLOAD_MAX_BYTES → error before uploading
  //    signature → <SignaturePad> → png File → upload() → store the id
  // 3. every input: onChange → setValue(path, value); onBlur → touch(path)
  return null
}

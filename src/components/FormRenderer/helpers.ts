/**
 * Pure helpers of the form renderer: dotted field paths, conditions, required checks and the
 * flattening of answers into the plugin's `submissionData`. No React, so they are unit tested
 * (`tests/form-builder/helpers.test.ts`) and reused by the server action in step 3 to re-check
 * a submission. Content blocks (`message`, `image`) are skipped everywhere.
 */
import { countryOptions, stateOptions } from './countries'
import { formText } from './i18n'
import type {
  FieldOf,
  FieldValue,
  FormValues,
  ListCounts,
  RenderField,
  RendererLocale,
  SubmissionRow,
} from './types'

/** Blocks that show content and never hold an answer. */
export const CONTENT_BLOCKS = ['message', 'image'] as const

export const isContentBlock = (
  field: RenderField,
): field is FieldOf<(typeof CONTENT_BLOCKS)[number]> =>
  field.blockType === 'message' || field.blockType === 'image'

/** `prefix` + `name`: `''` + `email` → `email`, `family.0.` + `name` → `family.0.name`. */
export const fieldPath = (prefix: string, name: string): string => `${prefix}${name}`

/** Element id for a field or step: the name without spaces, else the label slugified. */
export const buildIdSegment = (name?: string | null, label?: string | null): string => {
  if (name) return name.replace(/\s+/g, '')
  if (label) return label.trim().toLowerCase().replace(/\s+/g, '-')
  return ''
}

/** Whether a conditional block's fields show, given the current answers. */
export const evaluateCondition = (
  block: FieldOf<'conditional'>,
  values: FormValues,
  prefix: string,
): boolean => {
  const { condition_field, operator, value } = block
  if (!condition_field) return true

  // a condition inside a list row can watch a field outside it
  const watched = values[fieldPath(prefix, condition_field)] ?? values[condition_field]
  const actual = String(watched ?? '')
  const expected = String(value ?? '')

  switch (operator) {
    case 'not_equal':
      return actual !== expected
    case 'contains':
      return actual.toLowerCase().includes(expected.toLowerCase())
    case 'not_contains':
      return !actual.toLowerCase().includes(expected.toLowerCase())
    default:
      return actual === expected
  }
}

/** Whether an answer counts as filled for a required check. */
export const isFilled = (value: FieldValue | undefined): boolean => {
  if (value === undefined) return false
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return true
  return value.trim() !== ''
}

type Visit = (field: RenderField, path: string) => void

/**
 * Calls `visit` for every answer field the visitor can currently see, in form order, with its
 * dotted path: into groups, list rows, steps and matching conditionals. `onHidden` gets the
 * fields of conditionals that don't match.
 */
const walk = (
  fields: RenderField[],
  values: FormValues,
  listCounts: ListCounts,
  prefix: string,
  visit: Visit,
  onHidden?: (fields: RenderField[], prefix: string) => void,
): void => {
  for (const field of fields) {
    if (isContentBlock(field)) continue
    switch (field.blockType) {
      case 'group':
        walk(field.fields ?? [], values, listCounts, `${prefix}${field.name}.`, visit, onHidden)
        break
      case 'list': {
        const path = fieldPath(prefix, field.name)
        const rows = listCounts[path] ?? 1
        for (let row = 0; row < rows; row++) {
          walk(field.fields ?? [], values, listCounts, `${path}.${row}.`, visit, onHidden)
        }
        break
      }
      case 'conditional':
        if (evaluateCondition(field, values, prefix)) {
          walk(field.fields ?? [], values, listCounts, prefix, visit, onHidden)
        } else {
          onHidden?.(field.fields ?? [], prefix)
        }
        break
      case 'multi-step':
        for (const step of field.steps ?? []) {
          walk(step.fields ?? [], values, listCounts, prefix, visit, onHidden)
        }
        break
      default:
        visit(field, fieldPath(prefix, field.name))
    }
  }
}

export type MissingField = { path: string; label: string }

/**
 * Required fields without an answer, in form order. Walks groups (prefix `name.`), list rows
 * (`name.<i>.`, `listCounts` rows, default 1) and conditionals (only when they match: hidden
 * fields are never required). Content blocks are skipped.
 */
export const missingRequired = (
  fields: RenderField[],
  values: FormValues,
  listCounts: ListCounts,
  prefix = '',
): MissingField[] => {
  const missing: MissingField[] = []
  walk(fields, values, listCounts, prefix, (field, path) => {
    if ('required' in field && field.required && !isFilled(values[path])) {
      missing.push({ path, label: ('label' in field && field.label) || path })
    }
  })
  return missing
}

/** Dotted paths of every input inside a conditional that no longer matches (to clear them). */
export const hiddenFieldPaths = (
  fields: RenderField[],
  values: FormValues,
  listCounts: ListCounts,
  prefix = '',
): string[] => {
  const hidden: string[] = []
  const collect = (inner: RenderField[], innerPrefix: string) =>
    // everything inside counts as hidden, matched or not, so ignore nested conditions
    walk(
      inner,
      values,
      listCounts,
      innerPrefix,
      (_field, path) => hidden.push(path),
      (nested, nestedPrefix) => collect(nested, nestedPrefix),
    )
  walk(fields, values, listCounts, prefix, () => {}, collect)
  return hidden
}

/**
 * The answers as the plugin's `submissionData`, one row per visible input with a value,
 * in form order, under its dotted path (`address.city`, `family.0.name`). Hidden conditional
 * fields and content blocks are left out; values become strings.
 */
export const toSubmissionData = (
  fields: RenderField[],
  values: FormValues,
  listCounts: ListCounts,
): SubmissionRow[] => {
  const rows: SubmissionRow[] = []
  walk(fields, values, listCounts, '', (_field, path) => {
    const value = values[path]
    if (value !== undefined && value !== '') rows.push({ field: path, value: String(value) })
  })
  return rows
}

/**
 * The other way, for the server (`validateSubmission`): rows back into values. Values stay
 * strings except `'true'` / `'false'`, which become booleans so a required checkbox left
 * unticked is still missing.
 */
export const valuesFromSubmission = (
  rows: ReadonlyArray<{ field: string; value: string }> | null | undefined,
): FormValues => {
  const values: FormValues = {}
  for (const { field, value } of rows ?? []) {
    if (value === 'true') values[field] = true
    else if (value === 'false') values[field] = false
    else values[field] = value
  }
  return values
}

/** Rows per list as the values show them (`family.2.name` → `family: 3`), for the server. */
export const listCountsFrom = (values: FormValues): ListCounts => {
  const counts: ListCounts = {}
  for (const path of Object.keys(values)) {
    const segments = path.split('.')
    // nested lists too: `a.0.b.1.c` → a: 1, a.0.b: 2
    for (let i = 1; i < segments.length; i++) {
      const segment = segments[i] ?? ''
      if (!/^\d+$/.test(segment)) continue
      const prefix = segments.slice(0, i).join('.')
      counts[prefix] = Math.max(counts[prefix] ?? 0, Number(segment) + 1)
    }
  }
  return counts
}

/** The input field at a dotted path (`family.0.receipt`), or undefined; skips content blocks. */
export const fieldAtPath = (
  fields: RenderField[],
  path: string,
): Exclude<RenderField, FieldOf<'message' | 'image'>> | undefined => {
  let found: Exclude<RenderField, FieldOf<'message' | 'image'>> | undefined
  const visit: Visit = (field, fieldPathHere) => {
    if (!found && fieldPathHere === path && !isContentBlock(field)) found = field
  }
  // hidden branches included: an upload can come before the condition is re-checked
  const visitHidden = (inner: RenderField[], prefix: string): void =>
    walk(inner, {}, listCounts, prefix, visit, visitHidden)
  const listCounts = listCountsFrom({ [path]: '' })
  walk(fields, {}, listCounts, '', visit, visitHidden)
  return found
}

/** The label each visible answer path shows, for the review screen. */
export const visibleAnswers = (
  fields: RenderField[],
  values: FormValues,
  listCounts: ListCounts,
): { field: RenderField; path: string }[] => {
  const answers: { field: RenderField; path: string }[] = []
  walk(fields, values, listCounts, '', (field, path) => answers.push({ field, path }))
  return answers
}

/** Display text of an answer for the review screen: option labels, rating label, yes/no. */
export const answerText = (
  field: RenderField,
  value: FieldValue | undefined,
  locale: RendererLocale,
): string => {
  const text = formText(locale)
  if (value === undefined || value === '') return '—'
  switch (field.blockType) {
    case 'select':
    case 'radio':
      return field.options?.find((option) => option.value === value)?.label ?? String(value)
    case 'country':
      return countryOptions.find((option) => option.value === value)?.label ?? String(value)
    case 'state':
      return stateOptions.find((option) => option.value === value)?.label ?? String(value)
    case 'rating':
      return field.labels?.[Number(value) - 1]?.label ?? String(value)
    case 'checkbox':
      return value === true ? text.yes : text.no
    case 'file':
      return text.fileAttached
    case 'signature':
      return text.signed
    default:
      return String(value)
  }
}

/**
 * Removes row `row` of the list at `path`: later rows (their answers and nested list counts)
 * move up one index, so `family.2.name` becomes `family.1.name`. A list keeps at least one row.
 */
export const removeListRow = (
  values: FormValues,
  listCounts: ListCounts,
  path: string,
  row: number,
): { values: FormValues; listCounts: ListCounts } => {
  const shift = <T>(record: Record<string, T>): Record<string, T> => {
    const next: Record<string, T> = {}
    for (const [key, value] of Object.entries(record)) {
      const match = key.startsWith(`${path}.`)
        ? /^(\d+)(\..*)?$/.exec(key.slice(path.length + 1))
        : null
      if (!match) {
        next[key] = value
        continue
      }
      const index = Number(match[1])
      if (index === row) continue
      next[index > row ? `${path}.${index - 1}${match[2] ?? ''}` : key] = value
    }
    return next
  }
  const rows = listCounts[path] ?? 1
  return {
    values: shift(values),
    listCounts: { ...shift(listCounts), [path]: Math.max(1, rows - 1) },
  }
}

/** Scrolls to and focuses the first input of the field at `path` inside `root`. */
export const focusFirstError = (root: HTMLElement | null, path: string | undefined): void => {
  if (!root || !path) return
  // after React has rendered the error messages
  setTimeout(() => {
    const field = root.querySelector<HTMLElement>(
      `[data-field="${path.replace(/["\\]/g, '\\$&')}"]`,
    )
    field?.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
    field?.querySelector<HTMLElement>('input, select, textarea, canvas')?.focus()
  }, 0)
}

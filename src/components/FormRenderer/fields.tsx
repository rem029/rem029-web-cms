'use client'
/**
 * One input per answer field type: the plugin's stock fields (text, textarea, email, number,
 * select, radio, checkbox, date, country, state) and ours (phone, time, rating, scale, file,
 * signature). Rendered by `RecursiveFields`; reads and writes answers through
 * `useFormRenderer()`. Native inputs styled with theme tokens (as `src/components/ui`).
 *
 * Custom CSS contract: the wrapper is `fb-field fb-field--<blockType>` (+ `fb-field--error`)
 * with `data-field="<path>"` and the field's own `css_class`; inside it `fb-label`, `fb-input`,
 * `fb-help`, `fb-error`. `width` (percent) sets the wrapper's basis; full width on phones.
 */
import React, { useEffect, useState } from 'react'

import { countryOptions } from '@/blocks/old/Form/Country/options'
import { stateOptions } from '@/blocks/old/Form/State/options'
import { FORM_UPLOAD_MAX_BYTES, FORM_UPLOAD_MIME_TYPES } from '@/collections/FormUploads/constants'
import { cn } from '@/utilities/ui'

import { useFormRenderer } from './context'
import { buildIdSegment, fieldPath } from './helpers'
import { formText } from './i18n'
import { SignaturePad } from './signaturePad'
import type { FieldOf, FieldValue, RenderField } from './types'

/** Every block that holds an answer. */
export type InputField = Exclude<
  RenderField,
  FieldOf<'message' | 'image' | 'group' | 'list' | 'conditional' | 'multi-step'>
>

export type FieldControlProps = {
  field: InputField
  /** Dotted path prefix of the enclosing group or list row: '' or `family.0.`. */
  prefix: string
}

const INPUT_CLASS =
  'fb-input w-full rounded border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'

const CHOICE_CLASS =
  'fb-choice inline-flex min-h-10 min-w-10 cursor-pointer items-center justify-center rounded border border-border bg-background px-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring'

const inputIdFor = (path: string): string => `fb-${buildIdSegment(path)}`

type ShellProps = {
  field: InputField
  path: string
  inputId: string
  /** Radio-like groups label a fieldset with a legend instead of one input. */
  group?: boolean
  children: React.ReactNode
}

/** The wrapper every input shares: label (+ required mark), help text, error, width. */
export const FieldShell: React.FC<ShellProps> = ({ field, path, inputId, group, children }) => {
  const { errors } = useFormRenderer()
  const error = errors[path]
  const Wrapper = group ? 'fieldset' : 'div'
  const Label = group ? 'legend' : 'label'
  const widthStyle = field.width
    ? ({ '--fb-width': `${field.width}%` } as React.CSSProperties)
    : undefined

  return (
    <Wrapper
      className={cn(
        'fb-field flex grow basis-full flex-col gap-1.5',
        field.width && 'sm:basis-[calc(var(--fb-width)-1rem)]',
        `fb-field--${field.blockType}`,
        error && 'fb-field--error',
        field.css_class,
      )}
      data-field={path}
      style={widthStyle}
    >
      {field.blockType !== 'checkbox' && (
        <Label className="fb-label text-sm font-medium" {...(group ? {} : { htmlFor: inputId })}>
          {field.label || field.name}
          {field.required && (
            <span aria-hidden="true" className="text-destructive">
              {' *'}
            </span>
          )}
        </Label>
      )}
      {children}
      {field.help_text && (
        <p className="fb-help text-sm text-muted-foreground" id={`${inputId}-help`}>
          {field.help_text}
        </p>
      )}
      {error && (
        <p className="fb-error text-sm text-destructive" id={`${inputId}-error`} role="alert">
          {error}
        </p>
      )}
    </Wrapper>
  )
}

/** aria attributes linking an input to its help text and error. */
const describedBy = (field: InputField, inputId: string, error: string | undefined) => ({
  'aria-invalid': error ? true : undefined,
  'aria-required': field.required ? true : undefined,
  'aria-describedby':
    [field.help_text && `${inputId}-help`, error && `${inputId}-error`].filter(Boolean).join(' ') ||
    undefined,
})

const TEXT_TYPES = {
  text: 'text',
  email: 'email',
  phone: 'tel',
  number: 'number',
  date: 'date',
  time: 'time',
} as const

const defaultOf = (field: InputField): FieldValue | undefined =>
  'defaultValue' in field && field.defaultValue !== null && field.defaultValue !== undefined
    ? field.defaultValue
    : undefined

export const FieldControl: React.FC<FieldControlProps> = ({ field, prefix }) => {
  const { values, errors, disabled, setValue, locale } = useFormRenderer()
  const path = fieldPath(prefix, field.name)
  const inputId = inputIdFor(path)
  const value = values[path]
  const aria = describedBy(field, inputId, errors[path])
  const fallback = defaultOf(field)
  const text = formText(locale)

  // a field's default counts as an answer, like the old block's defaultValues
  useEffect(() => {
    if (value === undefined && fallback !== undefined) setValue(path, fallback)
  }, [value, fallback, path, setValue])

  const shell = (children: React.ReactNode, group = false) => (
    <FieldShell field={field} group={group} inputId={inputId} path={path}>
      {children}
    </FieldShell>
  )
  const onText = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => setValue(path, event.target.value)

  switch (field.blockType) {
    case 'text':
    case 'email':
    case 'phone':
    case 'number':
    case 'date':
    case 'time':
      return shell(
        <input
          {...aria}
          autoComplete={
            field.blockType === 'email' ? 'email' : field.blockType === 'phone' ? 'tel' : undefined
          }
          className={INPUT_CLASS}
          dir={field.blockType === 'phone' || field.blockType === 'email' ? 'ltr' : undefined}
          disabled={disabled}
          id={inputId}
          name={path}
          onChange={onText}
          type={TEXT_TYPES[field.blockType]}
          value={typeof value === 'boolean' ? '' : (value ?? '')}
        />,
      )
    case 'textarea':
      return shell(
        <textarea
          {...aria}
          className={cn(INPUT_CLASS, 'min-h-28')}
          disabled={disabled}
          id={inputId}
          name={path}
          onChange={onText}
          value={typeof value === 'boolean' ? '' : (value ?? '')}
        />,
      )
    case 'select':
    case 'country':
    case 'state': {
      const options =
        field.blockType === 'country'
          ? countryOptions
          : field.blockType === 'state'
            ? stateOptions
            : (field.options ?? [])
      return shell(
        <select
          {...aria}
          className={cn(INPUT_CLASS, 'h-10')}
          disabled={disabled}
          id={inputId}
          name={path}
          onChange={onText}
          value={typeof value === 'string' ? value : ''}
        >
          <option value="">{text.choose}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>,
      )
    }
    case 'radio':
      return shell(
        <ChoiceGroup
          aria={aria}
          choices={(field.options ?? []).map((option) => ({
            label: option.label,
            value: option.value,
          }))}
          direction={field.direction === 'row' ? 'row' : 'column'}
          disabled={disabled}
          inputId={inputId}
          onPick={(picked) => setValue(path, picked)}
          path={path}
          value={value}
          variant="radio"
        />,
        true,
      )
    case 'checkbox':
      return shell(
        <label className="flex items-center gap-2 text-sm" htmlFor={inputId}>
          <input
            {...aria}
            checked={value === true}
            className="fb-input h-4 w-4 accent-primary"
            disabled={disabled}
            id={inputId}
            name={path}
            onChange={(event) => setValue(path, event.target.checked)}
            type="checkbox"
          />
          <span className="fb-label font-medium">
            {field.label || field.name}
            {field.required && (
              <span aria-hidden="true" className="text-destructive">
                {' *'}
              </span>
            )}
          </span>
        </label>,
      )
    case 'rating': {
      const points = field.point_count ?? 5
      const labels = field.labels ?? []
      return shell(
        <ChoiceGroup
          aria={aria}
          choices={Array.from({ length: points }, (_, i) => ({
            value: i + 1,
            label: field.display === 'buttons' ? (labels[i]?.label ?? String(i + 1)) : '★',
            title: labels[i]?.label ?? String(i + 1),
          }))}
          direction="row"
          disabled={disabled}
          inputId={inputId}
          onPick={(picked) => setValue(path, picked)}
          path={path}
          value={value}
          variant={field.display === 'buttons' ? 'button' : 'star'}
        />,
        true,
      )
    }
    case 'scale': {
      const min = field.min ?? 1
      const max = field.max ?? 5
      const step = field.step && field.step > 0 ? field.step : 1
      const choices = Array.from({ length: Math.floor((max - min) / step) + 1 }, (_, i) => {
        const point = min + i * step
        return { value: point, label: String(point) }
      })
      return shell(
        <div className="flex flex-col gap-1">
          <ChoiceGroup
            aria={aria}
            choices={choices}
            direction="row"
            disabled={disabled}
            inputId={inputId}
            onPick={(picked) => setValue(path, picked)}
            path={path}
            value={value}
            variant="button"
          />
          {(field.min_label || field.max_label) && (
            <div className="fb-scale-labels flex justify-between text-xs text-muted-foreground">
              <span>{field.min_label}</span>
              <span>{field.max_label}</span>
            </div>
          )}
        </div>,
        true,
      )
    }
    case 'file':
    case 'signature':
      return shell(<UploadInput aria={aria} field={field} inputId={inputId} path={path} />)
  }
}

type Choice = { value: string | number; label: string; title?: string }

/** Native radios (arrow keys move between them) shown as a list, buttons or stars. */
const ChoiceGroup: React.FC<{
  aria: ReturnType<typeof describedBy>
  choices: Choice[]
  direction: 'row' | 'column'
  disabled: boolean
  inputId: string
  onPick: (value: string | number) => void
  path: string
  value: FieldValue | undefined
  variant: 'radio' | 'button' | 'star'
}> = ({ aria, choices, direction, disabled, inputId, onPick, path, value, variant }) => (
  <div
    aria-describedby={aria['aria-describedby']}
    aria-invalid={aria['aria-invalid']}
    className={cn('fb-choices flex flex-wrap gap-2', direction === 'column' && 'flex-col')}
    role="radiogroup"
  >
    {choices.map((choice, i) => {
      const id = `${inputId}-${i}`
      const checked = String(value ?? '') === String(choice.value)
      const filledStar = variant === 'star' && Number(value) >= Number(choice.value)
      return (
        <label
          className={cn(
            variant === 'radio' && 'flex items-center gap-2 text-sm',
            variant === 'button' && CHOICE_CLASS,
            variant === 'star' &&
              'fb-star cursor-pointer text-3xl leading-none text-muted-foreground has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
            filledStar && 'text-primary',
          )}
          htmlFor={id}
          key={choice.value}
          title={choice.title}
        >
          <input
            checked={checked}
            className={variant === 'radio' ? 'h-4 w-4 accent-primary' : 'sr-only'}
            disabled={disabled}
            id={id}
            name={path}
            onChange={() => onPick(choice.value)}
            type="radio"
            value={choice.value}
          />
          {variant === 'star' ? (
            <>
              <span aria-hidden="true">{choice.label}</span>
              <span className="sr-only">{choice.title}</span>
            </>
          ) : (
            choice.label
          )}
        </label>
      )
    })}
  </div>
)

/** File picker or signature pad; the file goes to `upload` and the answer is its id. */
const UploadInput: React.FC<{
  aria: ReturnType<typeof describedBy>
  field: FieldOf<'file' | 'signature'>
  inputId: string
  path: string
}> = ({ aria, field, inputId, path }) => {
  const { formId, values, disabled, setValue, setFieldError, upload, locale } = useFormRenderer()
  const [uploading, setUploading] = useState(false)
  const text = formText(locale)

  const store = async (file: File | null) => {
    if (!file) {
      setValue(path, undefined)
      return
    }
    if (!FORM_UPLOAD_MIME_TYPES.includes(file.type)) return setFieldError(path, text.wrongType)
    if (file.size > FORM_UPLOAD_MAX_BYTES) return setFieldError(path, text.tooLarge)

    setUploading(true)
    const result = await upload({ formId, fieldName: path, file }).catch(() => null)
    setUploading(false)
    if (result?.ok) {
      setValue(path, result.id)
    } else {
      setFieldError(path, result?.error || text.somethingWrong)
    }
  }

  return (
    <div className="flex flex-col gap-1" aria-busy={uploading || undefined}>
      {field.blockType === 'signature' ? (
        <SignaturePad
          clearLabel={text.clearSignature}
          disabled={disabled || uploading}
          id={inputId}
          onChange={(file) => void store(file)}
        />
      ) : (
        <input
          {...aria}
          accept={FORM_UPLOAD_MIME_TYPES.join(',')}
          className={cn(
            INPUT_CLASS,
            'h-auto file:me-3 file:rounded file:border-0 file:bg-muted file:px-3 file:py-1',
          )}
          disabled={disabled || uploading}
          id={inputId}
          name={path}
          onChange={(event) => void store(event.target.files?.[0] ?? null)}
          type="file"
        />
      )}
      <p className="fb-help text-xs text-muted-foreground" aria-live="polite">
        {uploading
          ? text.uploading
          : values[path] !== undefined
            ? field.blockType === 'signature'
              ? text.signed
              : text.fileAttached
            : field.blockType === 'file'
              ? text.uploadHint
              : null}
      </p>
    </div>
  )
}

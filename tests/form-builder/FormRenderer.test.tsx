// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { FormRenderer } from '@/components/FormRenderer'
import type { RendererLocale } from '@/components/FormRenderer/types'
import type { Form } from '@/payload-types'

import {
  conditionalFields,
  fakeSubmit,
  fakeUpload,
  formDoc,
  listFields,
  stockFields,
  twoStepFields,
} from './renderForms'

// the site's RichText reaches the Code block's copy button, which imports the admin UI (scss)
vi.mock('@payloadcms/ui/icons/Copy', () => ({ CopyIcon: () => null }))

const renderForm = (form: Form, locale: RendererLocale = 'en', submit = fakeSubmit()) => {
  const view = render(
    <FormRenderer form={form} locale={locale} submit={submit} upload={fakeUpload()} />,
  )
  return { ...view, submit }
}

describe('FormRenderer', () => {
  afterEach(() => {
    cleanup()
    localStorage.clear()
  })

  it('renders every stock field', () => {
    // arrange
    const form = formDoc(stockFields())

    // act
    renderForm(form)

    // assert
    const labels = [
      'Full name',
      'About you',
      'Email',
      'Guests',
      'Topic',
      'Inside',
      'Outside',
      'Newsletter',
      'Visit date',
      'Country',
      'State',
    ]
    expect(labels.filter((label) => !screen.queryByLabelText(label))).toEqual([])
    expect(screen.getByText('Fields marked * are required.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Send' })).toBeTruthy()
  })

  it('shows a conditional field only when matched', () => {
    // arrange
    renderForm(formDoc(conditionalFields()))

    // act
    fireEvent.click(screen.getByLabelText('Alone'))
    const afterAlone = screen.queryByLabelText(/Family note/)
    fireEvent.click(screen.getByLabelText('Family'))

    // assert
    expect(afterAlone).toBeNull()
    expect(screen.getByLabelText(/Family note/)).toBeTruthy()
  })

  it('skips required checks on hidden fields', async () => {
    // arrange
    const { submit } = renderForm(formDoc(conditionalFields()))
    fireEvent.click(screen.getByLabelText('Alone'))

    // act
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))

    // assert
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1))
    expect(screen.queryByText('This field is required.')).toBeNull()
  })

  it('adds list rows up to max_items', () => {
    // arrange
    renderForm(formDoc(listFields()))

    // act
    fireEvent.click(screen.getByRole('button', { name: 'Add Family' }))

    // assert
    expect(screen.getAllByLabelText('Name')).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Add Family' }).hasAttribute('disabled')).toBe(true)
  })

  it('walks a multi-step form to the review screen', () => {
    // arrange
    renderForm(formDoc(twoStepFields()))

    // act
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    const requiredShown = screen.queryByText('This field is required.')
    const stayed = screen.queryByLabelText(/Full name/)
    fireEvent.change(screen.getByLabelText(/Full name/), { target: { value: 'Sara' } })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    const onVisit = screen.queryByLabelText('Visit date')
    fireEvent.click(screen.getByRole('button', { name: 'Review' }))

    // assert
    expect(requiredShown).toBeTruthy()
    expect(stayed).toBeTruthy()
    expect(onVisit).toBeTruthy()
    expect(screen.getByText('Full name')).toBeTruthy()
    expect(screen.getByText('Sara')).toBeTruthy()
    expect(screen.getAllByRole('button', { name: /^Edit/ })).toHaveLength(2)
  })

  it('renders right-to-left in arabic', () => {
    // arrange
    const form = formDoc(twoStepFields())

    // act
    const { container } = renderForm(form, 'ar')

    // assert
    const root = container.querySelector('.fb-form')
    expect(root?.getAttribute('dir')).toBe('rtl')
    expect(root?.getAttribute('lang')).toBe('ar')
    expect(screen.getByRole('button', { name: 'التالي' })).toBeTruthy()
  })

  it('submits flattened answers and shows the confirmation', async () => {
    // arrange
    const { submit } = renderForm(formDoc(listFields()))

    // act
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Sara' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))

    // assert
    await waitFor(() => expect(screen.getByText('Thanks!')).toBeTruthy())
    expect(submit).toHaveBeenCalledWith({
      formId: 1,
      submissionData: [{ field: 'family.0.name', value: 'Sara' }],
    })
  })

  it('restores a saved draft', () => {
    // arrange
    const form = formDoc(listFields())
    const first = renderForm(form)
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Sara' } })
    first.unmount()

    // act
    renderForm(form)

    // assert
    expect(screen.getByLabelText<HTMLInputElement>('Name').value).toBe('Sara')
  })
})

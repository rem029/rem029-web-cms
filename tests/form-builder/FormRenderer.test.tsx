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
  richText,
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
      locale: 'en',
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

  it('adds field css classes and fb hooks', () => {
    // arrange
    const form = formDoc([
      { blockType: 'text', name: 'full_name', label: 'Full name', css_class: 'big-input' },
    ])

    // act
    renderForm(form)

    // assert
    const input = screen.getByLabelText('Full name')
    const wrapper = input.closest('[data-field="full_name"]')
    expect(wrapper?.className).toMatch(/\bfb-field\b/)
    expect(wrapper?.className).toMatch(/\bfb-field--text\b/)
    expect(wrapper?.className).toMatch(/\bbig-input\b/)
    expect(input.className).toMatch(/\bfb-input\b/)
    expect(wrapper?.querySelector('label')?.className).toMatch(/\bfb-label\b/)
  })

  it('renders content blocks without inputs', async () => {
    // arrange
    const { submit, container } = renderForm(
      formDoc([{ blockType: 'message', message: richText('Welcome') }]),
    )

    // act
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))

    // assert
    expect(container.querySelector('.fb-content--message')?.textContent).toContain('Welcome')
    expect(screen.queryByRole('textbox')).toBeNull()
    await waitFor(() =>
      expect(submit).toHaveBeenCalledWith({ formId: 1, locale: 'en', submissionData: [] }),
    )
  })

  it('applies appearance and scoped custom css to the root', () => {
    // arrange
    const form = formDoc(stockFields(), {
      appearance: { width: 'wide' },
      custom_css: '.fb-label { color: red; }',
    })

    // act
    const { container } = renderForm(form)

    // assert
    const root = container.querySelector('.fb-form')
    expect(root?.getAttribute('data-width')).toBe('wide')
    expect(root?.getAttribute('data-form-id')).toBe('1')
    expect(container.querySelector('style')?.textContent).toContain('[data-form-id="1"]')
  })

  it('shows a required error when leaving an empty field', () => {
    // arrange
    renderForm(formDoc(twoStepFields()))

    // act
    const input = screen.getByLabelText(/Full name/)
    fireEvent.focus(input)
    fireEvent.blur(input)

    // assert
    expect(screen.getByText('This field is required.')).toBeTruthy()
  })

  // proposed addition (step 3a)
  it('asks to accept the terms before submitting', async () => {
    // arrange
    const form = formDoc(stockFields(), {
      has_terms: true,
      terms_content: richText('Be kind to the staff.'),
    })
    const { submit } = renderForm(form)

    // act
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    const termsError = screen.queryByText('Please accept the terms to continue.')
    const calledBefore = submit.mock.calls.length
    fireEvent.click(screen.getByLabelText(/I accept the terms and conditions/))
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))

    // assert
    expect(screen.getByText('Be kind to the staff.')).toBeTruthy()
    expect(termsError).toBeTruthy()
    expect(calledBefore).toBe(0)
    await waitFor(() =>
      expect(submit).toHaveBeenCalledWith(expect.objectContaining({ termsAccepted: true })),
    )
  })

  // proposed addition (step 3a)
  it('sends the locale and the honeypot with the answers', async () => {
    // arrange
    const { submit, container } = renderForm(formDoc(listFields()), 'ar')
    const honeypot = container.querySelector<HTMLInputElement>('input[name="fb_website"]')
    if (!honeypot) throw new Error('tests: no honeypot input')
    fireEvent.change(honeypot, { target: { value: 'https://spam.example' } })

    // act
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))

    // assert
    await waitFor(() =>
      expect(submit).toHaveBeenCalledWith(
        expect.objectContaining({ locale: 'ar', honeypot: 'https://spam.example' }),
      ),
    )
  })
})

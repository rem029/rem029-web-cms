// @vitest-environment jsdom
// The picked table on the guest menu (rem0018 phase 3 step 2a,
// src/app/(frontend)/menu/_components/ordering/TableChip.tsx).
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { TableChip } from '@/app/(frontend)/menu/_components/ordering/TableChip'
import { menuStrings } from '@/app/(frontend)/menu/_i18n'
import type { OrderTable } from '@/common/utils/orderTables'

describe('TableChip', () => {
  afterEach(() => {
    cleanup()
  })

  it('shows the table from the qr code', () => {
    // arrange: table { id 1, slug 't5', label '5' }, locale en
    const table: OrderTable = { id: 1, slug: 't5', label: '5' }
    const onChange = vi.fn()

    // act: render
    const { rerender } = render(<TableChip locale="en" onChange={onChange} table={table} />)

    // assert: the button reads "Table 5 · Change"; with locale ar it reads "طاولة 5 · تغيير"
    const en = menuStrings('en')
    expect(screen.getByRole('button').textContent).toBe(`${en.table} ${table.label} · ${en.change}`)

    rerender(<TableChip locale="ar" onChange={onChange} table={table} />)
    const ar = menuStrings('ar')
    expect(screen.getByRole('button').textContent).toBe(`${ar.table} ${table.label} · ${ar.change}`)
  })

  it('opens the picker on change', () => {
    // arrange: table t5, onChange = vi.fn()
    const table: OrderTable = { id: 1, slug: 't5', label: '5' }
    const onChange = vi.fn()
    render(<TableChip locale="en" onChange={onChange} table={table} />)

    // act: click the button
    fireEvent.click(screen.getByRole('button'))

    // assert: onChange called once
    expect(onChange).toHaveBeenCalledTimes(1)
  })
})

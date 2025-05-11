'use client'

import { css } from '@/utilities/constants'
import * as React from 'react'
import { useFormContext } from 'react-hook-form'

export const Error = ({ name }: { name: string }) => {
  const {
    formState: { errors },
  } = useFormContext()
  return (
    <div className={css('form__input-error')}>
      {(errors[name]?.message as string) || 'This field is required'}
    </div>
  )
}

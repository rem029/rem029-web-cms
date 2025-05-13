import type { TextField } from '@payloadcms/plugin-form-builder/types'
import type { FieldErrorsImpl, FieldValues, UseFormRegister } from 'react-hook-form'

import React from 'react'

import { Error } from '../Error'

import { css } from '@/utilities/constants'
import { iconMap } from '../Component'
export const Number: React.FC<
  TextField & {
    errors: Partial<FieldErrorsImpl>
    register: UseFormRegister<FieldValues>
    icon?: string
  }
> = ({ name, defaultValue, errors, label, register, required, width, icon }) => {
  const IconComponent = icon ? iconMap[icon as keyof typeof iconMap] : undefined
  return (
    <div className={css('form__input-control')} style={{ width: width && `${width}%` }}>
      <label htmlFor={name}>
        {label}
        {required && (
          <span className="required">
            * <span className="sr-only">(required)</span>
          </span>
        )}
      </label>

      <div className={`${css('form__input')} ${css('form__input-rounded')}`}>
        {IconComponent && <IconComponent />}
        <input
          defaultValue={defaultValue}
          id={name}
          type="number"
          {...register(name, { required })}
        />
      </div>
      {errors[name] && <Error name={name} />}
    </div>
  )
}

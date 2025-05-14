import type { TextField } from '@payloadcms/plugin-form-builder/types'
import type { FieldErrorsImpl, FieldValues, UseFormRegister } from 'react-hook-form'

import React from 'react'

import { Error } from '../Error'
import { css } from '@/utilities/constants'
import { iconMap } from '../Component'

export const Textarea: React.FC<
  TextField & {
    errors: Partial<FieldErrorsImpl>
    register: UseFormRegister<FieldValues>
    rows?: number
    icon?: string
  }
> = ({ name, defaultValue, errors, label, register, required, rows = 3, width, icon }) => {
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

      <div className={css('form__input')}>
        {IconComponent && <IconComponent />}
        <textarea
          defaultValue={defaultValue}
          id={name}
          rows={rows}
          {...register(name, { required })}
        />
      </div>
      {errors[name] && <Error name={name} />}
    </div>
  )

  // return (
  //   <Width width={width} className={css('form__input-textarea')}>
  //     <Label htmlFor={name}>
  //       {label}

  //       {required && (
  //         <span className="required">
  //           * <span className="sr-only">(required)</span>
  //         </span>
  //       )}
  //     </Label>

  //     <TextAreaComponent
  //       defaultValue={defaultValue}
  //       id={name}
  //       rows={rows}
  //       {...register(name, { required: required })}
  //     />

  //     {errors[name] && <Error name={name} />}
  //   </Width>
  // )
}

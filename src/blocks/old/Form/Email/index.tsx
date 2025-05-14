import type { EmailField } from '@payloadcms/plugin-form-builder/types'
import type { FieldErrorsImpl, FieldValues, UseFormRegister } from 'react-hook-form'

import React from 'react'

import { Error } from '../Error'
import { css } from '@/utilities/constants'
import { iconMap } from '../Component'

export const Email: React.FC<
  EmailField & {
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
          type="email"
          {...register(name, { pattern: /^\S[^\s@]*@\S+$/, required })}
        />
      </div>
      {errors[name] && <Error name={name} />}
    </div>
  )

  // return (
  //   <Width width={width} className={css('form__input-email')}>
  //     <Label htmlFor={name}>
  //       {label}

  //       {required && (
  //         <span className="required">
  //           * <span className="sr-only">(required)</span>
  //         </span>
  //       )}
  //     </Label>
  //     <Input
  //       defaultValue={defaultValue}
  //       id={name}
  //       type="text"
  //       {...register(name, { pattern: /^\S[^\s@]*@\S+$/, required })}
  //     />

  //     {errors[name] && <Error name={name} />}
  //   </Width>
  // )
}

'use client'
import type { FormFieldBlock, Form as FormType } from '@payloadcms/plugin-form-builder/types'

import { useRouter } from 'next/navigation'
import React, { useCallback, useState } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import RichText from '@/components/RichText'
import { Button } from '@/components/ui/button'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import { IoIosSend } from 'react-icons/io'

import { fields } from './fields'
import { getClientSideURL } from '@/utilities/getURL'
import { css } from '@/utilities/constants'
import { addAnalytics } from '@/utilities/analytics'

import {
  UserIcon,
  AtSignIcon,
  PhoneIcon,
  MessageSquareIcon,
  HashIcon,
  CheckSquareIcon,
  MapPinIcon,
  BadgeCheckIcon,
} from 'lucide-react' // Example icon import
import { FormSubmission } from '@/payload-types'

export type FormBlockType = {
  blockName?: string
  blockType?: 'formBlock'
  enableIntro: boolean
  form: FormType
  introContent?: SerializedEditorState
}

// Define a mapping from your icon string values to actual icon components
export const iconMap = {
  person: UserIcon,
  email: AtSignIcon,
  phone: PhoneIcon,
  message: MessageSquareIcon,
  number: HashIcon,
  select: CheckSquareIcon,
  checkbox: CheckSquareIcon,
  location: MapPinIcon,
}

export const FormBlock: React.FC<
  {
    id?: string
  } & FormBlockType
> = (props) => {
  const {
    enableIntro,
    form: formFromProps,
    form: { id: formID, confirmationMessage, confirmationType, redirect, submitButtonLabel } = {},
    introContent,
  } = props

  const formMethods = useForm({
    defaultValues: formFromProps.fields,
  })
  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
  } = formMethods

  const [isLoading, setIsLoading] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState<boolean>()
  const [error, setError] = useState<{ message: string; status?: string } | undefined>()
  const router = useRouter()

  const onSubmit = useCallback(
    (data: FormFieldBlock[]) => {
      let loadingTimerID: ReturnType<typeof setTimeout>
      const submitForm = async () => {
        setError(undefined)

        const dataToSend = Object.entries(data).map(([name, value]) => ({
          field: name,
          value,
        }))

        // delay loading indicator by 1s
        loadingTimerID = setTimeout(() => {
          setIsLoading(true)
        }, 1000)

        let email = ''
        let phone = ''

        try {
          const response = await fetch(`${getClientSideURL()}/api/form-submissions`, {
            body: JSON.stringify({
              form: formID,
              submissionData: dataToSend,
            }),
            headers: {
              'Content-Type': 'application/json',
            },
            method: 'POST',
          })

          const result = await response.json()

          const formResponse: FormSubmission = result.doc

          email = formResponse?.submissionData?.find((item) => item.field === 'email')?.value || ''
          phone = formResponse?.submissionData?.find((item) => item.field === 'phone')?.value || ''

          clearTimeout(loadingTimerID)

          if (response.status >= 400 || !response.ok) {
            setIsLoading(false)

            setError({
              message: result.errors?.[0]?.message || 'Internal Server Error',
              status: result.status,
            })

            // Track form submission error
            addAnalytics({
              eventType: 'error',
              pagePath: typeof window !== 'undefined' ? window.location.pathname : '',
              email,
              phone,
              payload: {
                formID,
                formName: formFromProps?.title || 'Unknown Form',
                errorType: 'api_error',
                errorMessage: result.errors?.[0]?.message || 'Internal Server Error',
                errorStatus: result.status,
              },
            })

            return
          }

          setIsLoading(false)
          setHasSubmitted(true)

          // Track successful form submission
          addAnalytics({
            eventType: 'form_submission',
            pagePath: typeof window !== 'undefined' ? window.location.pathname : '',
            email,
            phone,
            payload: {
              formID,
              formName: formFromProps?.title || 'Unknown Form',
              success: true,
            },
          })

          if (confirmationType === 'redirect' && redirect) {
            const { url } = redirect

            const redirectUrl = url

            if (redirectUrl) router.push(redirectUrl)
          }

          // Analytics tracking is already done above
        } catch (err) {
          console.warn(err)
          setIsLoading(false)
          setError({
            message: 'Something went wrong.',
          })

          // Track form submission error
          addAnalytics({
            eventType: 'error',
            email,
            phone,
            payload: {
              formID,
              formName: formFromProps?.title || 'Unknown Form',
              errorType: 'client_error',
              errorMessage: 'Something went wrong.',
            },
          })
        }
      }

      void submitForm()
    },
    [router, formID, redirect, confirmationType, formFromProps?.title],
  )

  return (
    <div className={css('form')}>
      {enableIntro && introContent && !hasSubmitted && (
        <RichText className="mb-8 lg:mb-12" data={introContent} enableGutter={false} />
      )}
      <FormProvider {...formMethods}>
        {!isLoading && hasSubmitted && confirmationType === 'message' && (
          <div className={css('form-success-message')}>
            <RichText data={confirmationMessage} enableGutter={false} enableProse={false} />
            <BadgeCheckIcon />
          </div>
        )}
        {isLoading && !hasSubmitted && <p>Loading, please wait...</p>}
        {error && <div>{`${error.status || '500'}: ${error.message || ''}`}</div>}
        {!hasSubmitted && (
          <form id={formID} onSubmit={handleSubmit(onSubmit)}>
            {formFromProps &&
              formFromProps.fields &&
              formFromProps.fields?.map((field, index) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const Field: React.FC<any> = fields?.[field.blockType as keyof typeof fields]

                if (Field) {
                  return (
                    <Field
                      key={index}
                      form={formFromProps}
                      {...field}
                      {...formMethods}
                      control={control}
                      errors={errors}
                      register={register}
                    />
                  )
                }
                return null
              })}

            <Button className={css('btn-form')} form={formID} type="submit" variant="default">
              {submitButtonLabel} <IoIosSend />
            </Button>
          </form>
        )}
      </FormProvider>
    </div>
  )
}

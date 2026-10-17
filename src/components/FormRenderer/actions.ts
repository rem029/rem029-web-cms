'use server'
/**
 * The server actions the renderer calls (step 3b passes them to `FormRenderer` from the Form block
 * and `/forms/<slug>`): no `/api` call from the browser. Each reads the request (host → tenant,
 * session → user, trusted proxy → ip) and hands over to `submissions.ts`, where the checks live.
 */
import type { SubmitInput, UploadInput } from './submissions'
import type { SubmitResult, UploadResult } from './types'

export const submitFormAction = async (_input: SubmitInput): Promise<SubmitResult> => {
  // 1. payload = getPayload({ config }); context = await requestContext(payload)
  // 2. return submitForm(context, input)
  throw new Error('not implemented')
}

export const uploadFileAction = async (_input: UploadInput): Promise<UploadResult> => {
  // 1. as submitFormAction, with uploadFile
  throw new Error('not implemented')
}

// not exported: a 'use server' file exports only actions
// const requestContext = async (payload): Promise<SubmissionContext> =>
//   tenantId: await getFrontendTenantId()
//   user: (await payload.auth({ headers: await headers() })).user, if from `users`
//   ip: TRUST_PROXY === 'true' ? first x-forwarded-for entry : null

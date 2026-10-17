'use server'
/**
 * The server actions the renderer calls (step 3b passes them to `FormRenderer` from the Form block
 * and `/forms/<slug>`): no `/api` call from the browser. Each reads the request (host → tenant,
 * session → user, trusted proxy → ip) and hands over to `submissions.ts`, where the checks live.
 */
import configPromise from '@payload-config'
import { headers } from 'next/headers'
import { getPayload, type Payload } from 'payload'

import { clientIpFromHeaders } from '@/common/utils/auditLog'
import { getFrontendTenantId } from '@/common/utils/frontendTenant'

import {
  type SubmissionContext,
  type SubmitInput,
  type UploadInput,
  submitForm,
  uploadFile,
} from './submissions'
import type { SubmitResult, UploadResult } from './types'

export const submitFormAction = async (input: SubmitInput): Promise<SubmitResult> => {
  const payload = await getPayload({ config: configPromise })
  return submitForm(await requestContext(payload), input)
}

export const uploadFileAction = async (input: UploadInput): Promise<UploadResult> => {
  const payload = await getPayload({ config: configPromise })
  return uploadFile(await requestContext(payload), input)
}

// not exported: a 'use server' file exports only actions
const requestContext = async (payload: Payload): Promise<SubmissionContext> => {
  const headerList = await headers()
  const { user } = await payload.auth({ headers: headerList })
  return {
    payload,
    tenantId: await getFrontendTenantId(),
    user: user?.collection === 'users' ? user : null,
    ip: clientIpFromHeaders(headerList),
    // step 3b: ADD — visitor: { ip: clientIpFromHeaders ?? first x-forwarded-for ?? x-real-ip,
    // deviceType from user-agent (tablet / mobile / desktop, as src/utilities/analytics.ts),
    // pagePath: the referer's pathname when it is this host, else null }
  }
}

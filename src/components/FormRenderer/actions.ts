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
  type VisitorInfo,
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
    visitor: visitorFrom(headerList),
  }
}

// for logs and analytics only: these headers can be spoofed without a trusted proxy
const visitorFrom = (headerList: Headers): VisitorInfo => {
  const reportedIp =
    headerList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headerList.get('x-real-ip')?.trim() ||
    null
  return {
    ip: clientIpFromHeaders(headerList) ?? reportedIp?.slice(0, 64) ?? null,
    deviceType: deviceTypeOf(headerList.get('user-agent') ?? ''),
    pagePath: refererPath(headerList.get('referer'), headerList.get('host')),
  }
}

// as src/utilities/analytics.ts does in the browser
const deviceTypeOf = (userAgent: string): VisitorInfo['deviceType'] => {
  if (/tablet|ipad|playbook|silk/i.test(userAgent)) return 'tablet'
  if (/Mobile|Android|iP(hone|od)/i.test(userAgent)) return 'mobile'
  return 'desktop'
}

// the page the form was sent from, when the referer is this host
const refererPath = (referer: string | null, host: string | null): string | null => {
  if (!referer) return null
  try {
    const url = new URL(referer)
    return url.host === host ? url.pathname.slice(0, 512) : null
  } catch {
    return null
  }
}

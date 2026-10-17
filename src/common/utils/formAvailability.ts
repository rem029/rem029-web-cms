/**
 * Whether a form takes answers right now, and from whom: `isActive`, the `activeFrom`–`activeTo`
 * window and `requires_auth` (a member of the form's tenant). Shared by the submit/upload
 * actions (`src/components/FormRenderer/submissions.ts`, which turn the reason into the visitor's
 * words) and the `validateSubmission` hook on `form-submissions` (the REST backstop). Server only:
 * reads tenant rows through `access.ts`.
 */
import type { Form, User } from '@/payload-types'
import { getTenantRows, isActiveSuperUser, isDisabledUser } from '@/common/utils/access'
import { extractTenantId } from '@/common/utils/tenantCollections'

export type FormRefusal = 'inactive' | 'not_open_yet' | 'closed' | 'members_only'

/** `null` when `user` (or an anonymous visitor) may answer `form` at `now`. */
export const formRefusal = (
  form: Pick<Form, 'isActive' | 'activeFrom' | 'activeTo' | 'requires_auth' | 'tenant'>,
  user: User | null | undefined,
  now: Date,
): FormRefusal | null => {
  if (form.isActive === false) return 'inactive'
  if (form.activeFrom && now < new Date(form.activeFrom)) return 'not_open_yet'
  if (form.activeTo && now > new Date(form.activeTo)) return 'closed'
  if (form.requires_auth && !isMemberOf(user, extractTenantId(form.tenant))) return 'members_only'
  return null
}

const isMemberOf = (user: User | null | undefined, tenantId: number | null): boolean => {
  if (!user || isDisabledUser(user)) return false
  if (isActiveSuperUser(user)) return true
  return tenantId !== null && getTenantRows(user).some((row) => row.tenantId === tenantId)
}

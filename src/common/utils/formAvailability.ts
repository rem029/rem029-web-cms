/**
 * Whether a form takes answers right now, and from whom: `isActive`, the `activeFrom`–`activeTo`
 * window and `requires_auth` (a member of the form's tenant). Shared by the submit/upload
 * actions (`src/components/FormRenderer/submissions.ts`, which turn the reason into the visitor's
 * words) and the `validateSubmission` hook on `form-submissions` (the REST backstop). Server only:
 * reads tenant rows through `access.ts`.
 */
import type { Form, User } from '@/payload-types'

export type FormRefusal = 'inactive' | 'not_open_yet' | 'closed' | 'members_only'

/** `null` when `user` (or an anonymous visitor) may answer `form` at `now`. */
export const formRefusal = (
  _form: Pick<Form, 'isActive' | 'activeFrom' | 'activeTo' | 'requires_auth' | 'tenant'>,
  _user: User | null | undefined,
  _now: Date,
): FormRefusal | null => {
  // 1. isActive false → 'inactive'
  // 2. activeFrom set and now < activeFrom → 'not_open_yet'
  // 3. activeTo set and now > activeTo → 'closed'
  // 4. requires_auth and not (active super user, or a non-disabled user with a row in the
  //    form's tenant: getTenantRows + extractTenantId) → 'members_only'
  // 5. else null
  throw new Error('not implemented')
}

import { cookies, draftMode } from 'next/headers'

export async function GET(): Promise<Response> {
  const draft = await draftMode()
  draft.disable()
  const cookieStore = await cookies()
  cookieStore.delete('tenant-preview')
  return new Response('Draft mode is disabled')
}

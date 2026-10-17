/** Reading what a refused call says, for checks on validation messages. */

/**
 * The error's message plus every `data.errors[].message` (Payload's ValidationError keeps the field
 * messages there), joined with spaces. Throws when the call succeeds.
 */
export const rejectionText = async (call: Promise<unknown>): Promise<string> => {
  let err: unknown
  try {
    await call
  } catch (caught) {
    err = caught
  }
  if (err === undefined) {
    throw new Error('tests: expected a rejection')
  }
  if (!err || typeof err !== 'object') return String(err)
  const parts: string[] = []
  if ('message' in err && typeof err.message === 'string') {
    parts.push(err.message)
  }
  if (
    'data' in err &&
    err.data &&
    typeof err.data === 'object' &&
    'errors' in err.data &&
    Array.isArray(err.data.errors)
  ) {
    for (const item of err.data.errors) {
      if (
        item &&
        typeof item === 'object' &&
        'message' in item &&
        typeof item.message === 'string'
      ) {
        parts.push(item.message)
      }
    }
  }
  return parts.join(' ')
}

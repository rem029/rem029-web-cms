import type { BuilderRefusal, BuilderResult } from './builderTypes'

/** What editors see when a builder call gets no answer. */
export const OFFLINE_ERROR = "Couldn't reach the server. Check your connection and try again."

/**
 * Runs a builder server action from the admin. The actions answer refusals and server failures
 * themselves (`{ ok: false, error }`, logged on the server); a call that never gets an answer
 * (network down, a request over Next's body size limit) rejects instead, and comes back here as
 * a refusal too, so the panels show it and leave their busy state.
 */
export const callAction = async <R extends BuilderResult>(
  call: () => Promise<R>,
): Promise<R | BuilderRefusal> => {
  try {
    return await call()
  } catch {
    // nothing to log here: the browser has no logger, and Next logs a refused body on the server
    return { ok: false, error: OFFLINE_ERROR }
  }
}

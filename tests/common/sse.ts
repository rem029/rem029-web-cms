// Reads server-sent events from a route's Response in tests (rem0018: the guest track route and the
// staff stream): one reader keeps the buffer; `next(event)` waits for the next frame of that event.

export type SseFrame = {
  event: string
  data: unknown
}

export type FrameReader = {
  next: (until: string, timeoutMs?: number) => Promise<SseFrame>
}

export const openFrames = (response: Response): FrameReader => {
  if (!response.body) {
    throw new Error(`SSE response has no body (status ${response.status})`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  const parsedQueue: SseFrame[] = []

  const parseBuffer = () => {
    const parts = buffer.split('\n\n')
    buffer = parts.pop() ?? ''

    for (const part of parts) {
      if (!part.trim()) continue
      const lines = part.split('\n')
      let currentEvent = 'message'
      let currentData = ''

      for (const line of lines) {
        if (line.startsWith('event:')) {
          currentEvent = line.slice(6).trim()
        } else if (line.startsWith('data:')) {
          currentData = line.slice(5).trim()
        }
      }

      let parsedData: unknown = currentData
      try {
        parsedData = JSON.parse(currentData)
      } catch {
        // keep string
      }
      parsedQueue.push({ event: currentEvent, data: parsedData })
    }
  }

  return {
    next: async (until: string, timeoutMs = 5000): Promise<SseFrame> => {
      const matchIndex = parsedQueue.findIndex((f) => f.event === until)
      if (matchIndex !== -1) {
        const [matched] = parsedQueue.splice(matchIndex, 1)
        if (matched) return matched
      }

      let timer: ReturnType<typeof setTimeout> | undefined

      const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          void reader.cancel()
          reject(new Error(`Timed out waiting for SSE event "${until}" after ${timeoutMs}ms`))
        }, timeoutMs)
        if (typeof timer.unref === 'function') {
          timer.unref()
        }
      })

      const readLoop = async (): Promise<SseFrame> => {
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            throw new Error(`Stream closed before receiving SSE event "${until}"`)
          }

          buffer += decoder.decode(value, { stream: true })
          parseBuffer()

          const idx = parsedQueue.findIndex((f) => f.event === until)
          if (idx !== -1) {
            const [matched] = parsedQueue.splice(idx, 1)
            if (matched) return matched
          }
        }
      }

      try {
        return await Promise.race([readLoop(), timeoutPromise])
      } finally {
        if (timer) {
          clearTimeout(timer)
        }
      }
    },
  }
}

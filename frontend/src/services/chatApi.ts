import type { ChatStreamEvent } from '../types/chat'

const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')

function readErrorMessage(payload: unknown): string {
  if (typeof payload === 'object' && payload !== null && 'detail' in payload) {
    const detail = payload.detail
    if (typeof detail === 'string') return detail
  }
  return 'The chat request failed. Please try again.'
}

function parseEvent(frame: string): ChatStreamEvent | null {
  const data = frame
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trimStart())
    .join('\n')

  if (!data) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(data)
  } catch {
    return null
  }

  if (typeof parsed !== 'object' || parsed === null || !('type' in parsed)) {
    return null
  }
  if (parsed.type === 'delta' && 'content' in parsed && typeof parsed.content === 'string') {
    return { type: 'delta', content: parsed.content }
  }
  if (parsed.type === 'done') return { type: 'done' }
  if (parsed.type === 'error' && 'message' in parsed && typeof parsed.message === 'string') {
    return { type: 'error', message: parsed.message }
  }
  return null
}

export async function streamChat(
  message: string,
  onDelta: (content: string) => void,
  signal: AbortSignal,
): Promise<void> {
  const response = await fetch(`${apiUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({ message }),
    signal,
  })

  if (!response.ok) {
    let payload: unknown
    try {
      payload = await response.json()
    } catch {
      payload = null
    }
    throw new Error(readErrorMessage(payload))
  }
  if (!response.body) throw new Error('The server returned an empty response stream.')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  const handleFrame = (frame: string) => {
    const event = parseEvent(frame)
    if (!event) return
    if (event.type === 'delta') onDelta(event.content)
    if (event.type === 'error') throw new Error(event.message)
  }

  try {
    while (true) {
      const { value, done } = await reader.read()
      buffer += decoder.decode(value, { stream: !done }).replace(/\r\n/g, '\n')

      let boundary = buffer.indexOf('\n\n')
      while (boundary !== -1) {
        handleFrame(buffer.slice(0, boundary))
        buffer = buffer.slice(boundary + 2)
        boundary = buffer.indexOf('\n\n')
      }

      if (done) break
    }
    if (buffer.trim()) handleFrame(buffer)
  } catch (error) {
    await reader.cancel(error)
    throw error
  } finally {
    reader.releaseLock()
  }
}

export type ChatRole = 'user' | 'assistant'

export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
}

type DeltaEvent = { type: 'delta'; content: string }
type DoneEvent = { type: 'done' }
type ErrorEvent = { type: 'error'; message: string }

export type ChatStreamEvent = DeltaEvent | DoneEvent | ErrorEvent

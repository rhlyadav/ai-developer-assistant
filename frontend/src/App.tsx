import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { streamChat } from './services/chatApi'
import type { ChatMessage } from './types/chat'

const prompts = [
  'When should I use useMemo?',
  'Explain REST vs GraphQL',
  'How does async/await work?',
]

function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const requestController = useRef<AbortController | null>(null)
  const endOfMessages = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endOfMessages.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, loading])

  useEffect(() => () => requestController.current?.abort(), [])

  async function sendMessage(rawMessage: string) {
    const message = rawMessage.trim()
    if (!message || loading) return

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message,
    }
    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
    }
    const controller = new AbortController()

    requestController.current = controller
    setMessages((current) => [...current, userMessage, assistantMessage])
    setDraft('')
    setError('')
    setLoading(true)

    try {
      await streamChat(
        message,
        (content) => {
          setMessages((current) =>
            current.map((item) =>
              item.id === assistantMessage.id
                ? { ...item, content: item.content + content }
                : item,
            ),
          )
        },
        controller.signal,
      )
    } catch (requestError) {
      if (!(requestError instanceof DOMException && requestError.name === 'AbortError')) {
        setError(requestError instanceof Error ? requestError.message : 'Unable to send your message.')
      }
    } finally {
      if (requestController.current === controller) {
        requestController.current = null
        setLoading(false)
      }
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void sendMessage(draft)
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      event.currentTarget.form?.requestSubmit()
    }
  }

  return (
    <main className="workspace">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Dev Assistant home">
          <span className="brand-mark" aria-hidden="true">DA</span>
          <span className="brand-name">dev<span>assistant</span></span>
        </a>
        <div className="workspace-label"><span className="status-dot" /> MILESTONE 01 <span className="label-divider">/</span> CHAT</div>
        <button className="profile-button" type="button" aria-label="Profile">Y</button>
      </header>

      <section className="chat-layout" aria-label="Developer assistant chat">
        <div className={`conversation ${messages.length === 0 ? 'conversation-empty' : ''}`} aria-live="polite">
          {messages.length === 0 ? (
            <div className="welcome">
              <div className="welcome-symbol" aria-hidden="true">&lt;/&gt;</div>
              <p className="eyebrow">YOUR DEV DESK</p>
              <h1>What are you<br /><em>working through?</em></h1>
              <p className="welcome-copy">Ask a question. Follow the answer as it takes shape.</p>
              <div className="prompt-list" aria-label="Try a question">
                {prompts.map((prompt) => (
                  <button className="prompt-chip" key={prompt} onClick={() => void sendMessage(prompt)} type="button">
                    <span aria-hidden="true">↗</span>{prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="message-list">
              {messages.map((message) => (
                <article className={`message message-${message.role}`} key={message.id}>
                  <div className="message-avatar" aria-hidden="true">{message.role === 'assistant' ? 'DA' : 'Y'}</div>
                  <div className="message-body">
                    <div className="message-heading">
                      <strong>{message.role === 'assistant' ? 'Assistant' : 'You'}</strong>
                      {message.role === 'assistant' && <span>DEVELOPER KNOWLEDGE</span>}
                    </div>
                    {message.content ? (
                      <p className="message-content">{message.content}</p>
                    ) : loading && message.role === 'assistant' ? (
                      <div className="typing-indicator" aria-label="Assistant is responding"><i /><i /><i /></div>
                    ) : null}
                  </div>
                </article>
              ))}
              <div ref={endOfMessages} />
            </div>
          )}
        </div>

        <div className="composer-area">
          {error && (
            <div className="error-banner" role="alert">
              <span>{error}</span>
              <button type="button" onClick={() => setError('')} aria-label="Dismiss error">×</button>
            </div>
          )}
          <form className="composer" onSubmit={handleSubmit}>
            <label className="sr-only" htmlFor="chat-message">Message the assistant</label>
            <textarea
              id="chat-message"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              placeholder="Ask a developer question..."
              rows={1}
              maxLength={12_000}
              disabled={loading}
            />
            <div className="composer-footer">
              <span className="composer-hint">Answers may be imperfect. Verify critical details.</span>
              <div className="composer-actions">
                <span className="key-hint">ENTER TO SEND</span>
                <button className="send-button" type="submit" disabled={loading || !draft.trim()} aria-label="Send message" title="Send message">
                  {loading ? <span className="send-spinner" aria-hidden="true" /> : <span aria-hidden="true">↑</span>}
                </button>
              </div>
            </div>
          </form>
          <p className="privacy-note">Your message is sent to the configured model provider.</p>
        </div>
      </section>
    </main>
  )
}

export default App

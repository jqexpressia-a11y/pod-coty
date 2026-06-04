import { useEffect, useRef, useState, useCallback } from 'react'
import { type Conversation, type Message, MODELS } from '../types'
import MessageBubble, { StreamingBubble } from './MessageBubble'
import VoiceButton from './VoiceButton'

interface Props {
  conversation: Conversation
  onTitleChange: () => void
}

export default function ChatWindow({ conversation, onTitleChange }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [streaming, setStreaming] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Load messages when conversation changes
  useEffect(() => {
    window.api.getMessages(conversation.id).then(setMessages)
    setStreaming('')
    setIsStreaming(false)
    setError('')
  }, [conversation.id])

  // Register streaming listeners
  useEffect(() => {
    const offToken = window.api.onToken(({ conversationId, token }) => {
      if (conversationId !== conversation.id) return
      setStreaming((prev) => prev + token)
    })

    const offDone = window.api.onDone(({ conversationId }) => {
      if (conversationId !== conversation.id) return
      setIsStreaming(false)
      setStreaming('')
      window.api.getMessages(conversation.id).then((msgs) => {
        setMessages(msgs)
        onTitleChange()
      })
    })

    const offError = window.api.onError(({ conversationId, error: err }) => {
      if (conversationId !== conversation.id) return
      setIsStreaming(false)
      setStreaming('')
      setError(err)
    })

    return () => {
      offToken()
      offDone()
      offError()
    }
  }, [conversation.id, onTitleChange])

  // Scroll to bottom on new content
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming])

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || isStreaming) return
    setInput('')
    setError('')
    setIsStreaming(true)

    const outgoing = [...messages, { role: 'user', content: text } as Message]

    try {
      await window.api.sendMessage({
        conversationId: conversation.id,
        messages: outgoing.map((m) => ({ role: m.role, content: m.content })),
        model: conversation.model
      })
    } catch (err) {
      setIsStreaming(false)
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [input, isStreaming, messages, conversation])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  function handleVoiceTranscript(text: string, isFinal: boolean) {
    setInput(text)
    if (isFinal && text.trim()) {
      setTimeout(() => {
        send()
      }, 100)
    }
  }

  async function handleExport() {
    const allMsgs = await window.api.getMessages(conversation.id)
    const result = await window.api.exportChat({
      title: conversation.title,
      messages: allMsgs.map((m) => ({ role: m.role, content: m.content }))
    })
    if (result.saved) setError('')
  }

  // Auto-resize textarea
  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }

  const modelLabel = MODELS.find((m) => m.id === conversation.model)?.label ?? conversation.model

  return (
    <div className="chat-window">
      <div className="chat-header">
        <span className="chat-title">{conversation.title}</span>
        <div className="chat-actions">
          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            {modelLabel}
          </span>
          <button className="export-btn" onClick={handleExport} title="Export as Markdown">
            ↓ Export
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="messages">
        {messages.length === 0 && !streaming && (
          <div className="empty-state">
            <div className="logo">⬡</div>
            <p>Start a conversation</p>
            <p style={{ fontSize: 12 }}>Shift+Enter for newline · 🎙 for voice</p>
          </div>
        )}

        {messages.map((m) => (
          <MessageBubble
            key={m.id}
            message={m}
            onSaveAsSkill={async (content) => {
              const title = content.slice(0, 60)
              await window.api.addSkill({ title, content })
            }}
          />
        ))}

        {streaming && <StreamingBubble content={streaming} />}

        <div ref={bottomRef} />
      </div>

      <div className="input-area">
        <VoiceButton onTranscript={handleVoiceTranscript} disabled={isStreaming} />

        <div className="input-wrap">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Message Claude… (Enter to send, Shift+Enter for newline)"
            rows={1}
            disabled={isStreaming}
          />
        </div>

        <button
          className="send-btn"
          onClick={send}
          disabled={!input.trim() || isStreaming}
          title="Send"
        >
          ↑
        </button>
      </div>
    </div>
  )
}

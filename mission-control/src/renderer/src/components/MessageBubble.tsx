import { useState } from 'react'
import { type Message } from '../types'

interface Props {
  message: Message
  onSaveAsSkill?: (content: string) => void
}

export default function MessageBubble({ message, onSaveAsSkill }: Props) {
  const [showSave, setShowSave] = useState(false)

  return (
    <div
      className={`message ${message.role}`}
      onMouseEnter={() => setShowSave(true)}
      onMouseLeave={() => setShowSave(false)}
    >
      <div className="message-role-row">
        <span className="message-role">{message.role === 'user' ? 'You' : 'Claude'}</span>
        {showSave && onSaveAsSkill && (
          <button
            className="save-skill-btn"
            onClick={() => onSaveAsSkill(message.content)}
            title="Save as skill"
          >
            ⬡ Save as skill
          </button>
        )}
      </div>
      <div className="message-bubble">{message.content}</div>
    </div>
  )
}

export function StreamingBubble({ content }: { content: string }) {
  return (
    <div className="message assistant">
      <div className="message-role-row">
        <span className="message-role">Claude</span>
      </div>
      <div className="message-bubble">
        {content}
        <span className="cursor" />
      </div>
    </div>
  )
}

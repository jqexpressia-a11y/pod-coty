import { type Message } from '../types'

interface Props {
  message: Message
}

export default function MessageBubble({ message }: Props) {
  return (
    <div className={`message ${message.role}`}>
      <span className="message-role">{message.role === 'user' ? 'You' : 'Claude'}</span>
      <div className="message-bubble">{message.content}</div>
    </div>
  )
}

export function StreamingBubble({ content }: { content: string }) {
  return (
    <div className="message assistant">
      <span className="message-role">Claude</span>
      <div className="message-bubble">
        {content}
        <span className="cursor" />
      </div>
    </div>
  )
}

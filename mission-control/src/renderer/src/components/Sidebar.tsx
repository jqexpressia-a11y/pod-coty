import { type Conversation, MODELS, type ModelId } from '../types'

interface Props {
  conversations: Conversation[]
  activeId: number | null
  onSelect: (id: number) => void
  onNew: (model: ModelId) => void
  onDelete: (id: number) => void
  selectedModel: ModelId
  onModelChange: (m: ModelId) => void
}

export default function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  selectedModel,
  onModelChange
}: Props) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1>⬡ Mission Control</h1>
        <p>Pod City AI Dashboard</p>
      </div>

      <button className="new-chat-btn" onClick={() => onNew(selectedModel)}>
        <span>+</span> New chat
      </button>

      <select
        className="model-select"
        style={{ margin: '0 12px 8px', width: 'calc(100% - 24px)' }}
        value={selectedModel}
        onChange={(e) => onModelChange(e.target.value as ModelId)}
      >
        {MODELS.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}
          </option>
        ))}
      </select>

      <div className="conv-list">
        {conversations.length === 0 && (
          <p style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 10px' }}>
            No chats yet
          </p>
        )}
        {conversations.map((c) => (
          <div
            key={c.id}
            className={`conv-item ${c.id === activeId ? 'active' : ''}`}
            onClick={() => onSelect(c.id)}
          >
            <span className="conv-title">{c.title}</span>
            <span className="conv-model">{MODELS.find((m) => m.id === c.model)?.label ?? ''}</span>
            <button
              className="delete-btn"
              onClick={(e) => {
                e.stopPropagation()
                if (confirm('Delete this chat?')) onDelete(c.id)
              }}
              title="Delete"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </aside>
  )
}

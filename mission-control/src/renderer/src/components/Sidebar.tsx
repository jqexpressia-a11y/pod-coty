import { type Conversation, MODELS, type ModelId } from '../types'
import SpotifyWidget from './SpotifyWidget'

type Tab = 'chats' | 'skills'

interface Props {
  tab: Tab
  onTabChange: (t: Tab) => void
  conversations: Conversation[]
  activeId: number | null
  onSelect: (id: number) => void
  onNew: (model: ModelId) => void
  onDelete: (id: number) => void
  selectedModel: ModelId
  onModelChange: (m: ModelId) => void
}

export default function Sidebar({
  tab,
  onTabChange,
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

      <div className="sidebar-tabs">
        <button
          className={`sidebar-tab ${tab === 'chats' ? 'active' : ''}`}
          onClick={() => onTabChange('chats')}
        >
          Chats
        </button>
        <button
          className={`sidebar-tab ${tab === 'skills' ? 'active' : ''}`}
          onClick={() => onTabChange('skills')}
        >
          Skills
        </button>
      </div>

      {tab === 'chats' && (
        <>
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
        </>
      )}

      {tab === 'skills' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', padding: '6px 14px 2px' }}>
            Open the Skills panel →
          </p>
        </div>
      )}

      <SpotifyWidget />
    </aside>
  )
}

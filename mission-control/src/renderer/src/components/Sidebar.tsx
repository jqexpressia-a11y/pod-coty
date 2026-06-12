import { useEffect, useState } from 'react'
import { type Conversation, MODELS, type ModelId, type Provider } from '../types'
import SpotifyWidget from './SpotifyWidget'
import type { SidebarTab } from '../App'

interface Props {
  tab: SidebarTab
  onTabChange: (t: SidebarTab) => void
  conversations: Conversation[]
  activeId: number | null
  onSelect: (id: number) => void
  onNew: (model: ModelId) => void
  onDelete: (id: number) => void
  selectedModel: ModelId
  onModelChange: (m: ModelId) => void
}

function ProviderBar() {
  const [provider, setProvider] = useState<Provider>('anthropic')
  const [fccOk, setFccOk] = useState(false)

  const refresh = async () => {
    const status = await window.api.getProviderStatus()
    setProvider(status.provider)
    setFccOk(status.fccReachable)
  }

  useEffect(() => {
    refresh()
    const t = setInterval(refresh, 30_000)
    return () => clearInterval(t)
  }, [])

  const toggle = async () => {
    const next: Provider = provider === 'anthropic' ? 'fcc' : 'anthropic'
    await window.api.setProvider(next)
    refresh()
  }

  return (
    <div className="provider-bar">
      <span className={`provider-label ${provider === 'fcc' ? 'fcc' : ''}`}>
        {provider === 'fcc' ? '⚡ Free Claude' : '◆ Anthropic'}
      </span>
      {provider === 'fcc' && (
        <span className={`provider-dot ${fccOk ? 'ok' : 'err'}`} title={fccOk ? 'FCC reachable' : 'FCC offline'} />
      )}
      <button className="provider-toggle" onClick={toggle}>
        {provider === 'fcc' ? 'API' : 'FCC'}
      </button>
    </div>
  )
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

      <ProviderBar />

      <div className="sidebar-tabs">
        {(['chats', 'skills', 'vault', 'journal', 'kanban'] as SidebarTab[]).map((t) => (
          <button
            key={t}
            className={`sidebar-tab ${tab === t ? 'active' : ''}`}
            onClick={() => onTabChange(t)}
          >
            {t === 'chats' ? 'Chat' : t === 'skills' ? 'Skills' : t === 'vault' ? 'Vault' : t === 'journal' ? 'Notes' : 'Board'}
          </button>
        ))}
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

      {tab !== 'chats' && (
        <div style={{ flex: 1, padding: '8px 14px' }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {tab === 'skills' && 'Manage your skill library →'}
            {tab === 'vault' && 'Browse Obsidian vault →'}
            {tab === 'journal' && 'Daily notes →'}
            {tab === 'kanban' && 'Task board →'}
          </p>
        </div>
      )}

      <SpotifyWidget />
    </aside>
  )
}

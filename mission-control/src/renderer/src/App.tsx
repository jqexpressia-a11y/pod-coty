import { useCallback, useEffect, useState } from 'react'
import { type Conversation, type ModelId, MODELS } from './types'
import Sidebar from './components/Sidebar'
import ChatWindow from './components/ChatWindow'
import SkillsPanel from './components/SkillsPanel'
import VaultPanel from './components/VaultPanel'
import JournalPanel from './components/JournalPanel'
import KanbanPanel from './components/KanbanPanel'

export type SidebarTab = 'chats' | 'skills' | 'vault' | 'journal' | 'kanban'

export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [selectedModel, setSelectedModel] = useState<ModelId>(MODELS[1].id)
  const [tab, setTab] = useState<SidebarTab>('chats')

  const loadConversations = useCallback(async () => {
    setConversations(await window.api.getConversations())
  }, [])

  useEffect(() => { loadConversations() }, [loadConversations])

  async function handleNew(model: ModelId) {
    const id = await window.api.createConversation(model)
    await loadConversations()
    setActiveId(id)
    setTab('chats')
  }

  async function handleDelete(id: number) {
    await window.api.deleteConversation(id)
    if (activeId === id) setActiveId(null)
    await loadConversations()
  }

  const activeConv = conversations.find((c) => c.id === activeId) ?? null

  return (
    <div className="app">
      <Sidebar
        tab={tab}
        onTabChange={setTab}
        conversations={conversations}
        activeId={activeId}
        onSelect={(id) => { setActiveId(id); setTab('chats') }}
        onNew={handleNew}
        onDelete={handleDelete}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
      />

      {tab === 'skills' ? (
        <SkillsPanel />
      ) : tab === 'vault' ? (
        <VaultPanel />
      ) : tab === 'journal' ? (
        <JournalPanel />
      ) : tab === 'kanban' ? (
        <KanbanPanel />
      ) : activeConv ? (
        <ChatWindow
          key={activeConv.id}
          conversation={activeConv}
          onTitleChange={loadConversations}
        />
      ) : (
        <div className="no-selection">
          <div className="hint">⬡</div>
          <p>Select a chat or start a new one</p>
        </div>
      )}
    </div>
  )
}

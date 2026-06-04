import { useCallback, useEffect, useState } from 'react'
import { type Conversation, type ModelId, MODELS } from './types'
import Sidebar from './components/Sidebar'
import ChatWindow from './components/ChatWindow'

export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [selectedModel, setSelectedModel] = useState<ModelId>(MODELS[1].id)

  const loadConversations = useCallback(async () => {
    const convs = await window.api.getConversations()
    setConversations(convs)
  }, [])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  async function handleNew(model: ModelId) {
    const id = await window.api.createConversation(model)
    await loadConversations()
    setActiveId(id)
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
        conversations={conversations}
        activeId={activeId}
        onSelect={setActiveId}
        onNew={handleNew}
        onDelete={handleDelete}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
      />

      {activeConv ? (
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

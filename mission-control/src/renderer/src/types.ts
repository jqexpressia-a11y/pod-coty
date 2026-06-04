export interface Conversation {
  id: number
  title: string
  model: string
  created_at: number
  updated_at: number
}

export interface Message {
  id: number
  conversation_id: number
  role: 'user' | 'assistant'
  content: string
  created_at: number
}

export const MODELS = [
  { id: 'claude-opus-4-8', label: 'Opus 4' },
  { id: 'claude-sonnet-4-6', label: 'Sonnet 4' },
  { id: 'claude-haiku-4-5-20251001', label: 'Haiku 4' }
] as const

export type ModelId = (typeof MODELS)[number]['id']

declare global {
  interface Window {
    api: {
      getConversations(): Promise<Conversation[]>
      getMessages(id: number): Promise<Message[]>
      createConversation(model: string): Promise<number>
      deleteConversation(id: number): Promise<{ ok: boolean }>
      sendMessage(payload: {
        conversationId: number
        messages: { role: string; content: string }[]
        model: string
      }): Promise<{ ok: boolean }>
      exportChat(payload: {
        title: string
        messages: { role: string; content: string }[]
      }): Promise<{ saved: boolean; filePath?: string }>
      onToken(cb: (d: { conversationId: number; token: string }) => void): () => void
      onDone(cb: (d: { conversationId: number }) => void): () => void
      onError(cb: (d: { conversationId: number; error: string }) => void): () => void
    }
  }
}

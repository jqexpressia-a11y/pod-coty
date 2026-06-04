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

export interface Skill {
  id: number
  title: string
  content: string
  use_count: number
  score: number
  last_used: number | null
  archived: number
  created_at: number
}

export interface CuratorReport {
  run_at: string
  reviewed: number
  archived: number
  archived_titles: string[]
  notes: string[]
}

export interface SpotifyTrack {
  id: string
  name: string
  artists: string
  album_art: string
  is_playing: boolean
  progress_ms: number
  duration_ms: number
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
      // Conversations
      getConversations(): Promise<Conversation[]>
      getMessages(id: number): Promise<Message[]>
      createConversation(model: string): Promise<number>
      deleteConversation(id: number): Promise<{ ok: boolean }>
      // Chat
      sendMessage(p: { conversationId: number; messages: { role: string; content: string }[]; model: string }): Promise<{ ok: boolean }>
      exportChat(p: { title: string; messages: { role: string; content: string }[] }): Promise<{ saved: boolean; filePath?: string }>
      // Streaming
      onToken(cb: (d: { conversationId: number; token: string }) => void): () => void
      onDone(cb: (d: { conversationId: number }) => void): () => void
      onError(cb: (d: { conversationId: number; error: string }) => void): () => void
      // Skills
      listSkills(): Promise<Skill[]>
      addSkill(p: { title: string; content: string }): Promise<{ id: number }>
      useSkill(id: number): Promise<{ ok: boolean }>
      deleteSkill(id: number): Promise<{ ok: boolean }>
      // Curator
      runCurator(): Promise<CuratorReport>
      getCuratorReport(): Promise<CuratorReport | null>
      // Spotify
      spotifyConnected(): Promise<{ connected: boolean; hasClientId: boolean }>
      spotifyStatus(): Promise<SpotifyTrack | null>
      spotifyAuthStart(): Promise<{ ok: boolean }>
      spotifyDisconnect(): Promise<{ ok: boolean }>
      spotifyPlay(): Promise<{ ok: boolean }>
      spotifyPause(): Promise<{ ok: boolean }>
      spotifyNext(): Promise<{ ok: boolean }>
      spotifyPrev(): Promise<{ ok: boolean }>
      onSpotifyUpdate(cb: (track: SpotifyTrack | null) => void): () => void
      onSpotifyAuthComplete(cb: (r: { ok: boolean; error?: string }) => void): () => void
    }
  }
}

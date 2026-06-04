import { contextBridge, ipcRenderer } from 'electron'

export type ApiToken = { conversationId: number; token: string }
export type ApiDone = { conversationId: number }
export type ApiError = { conversationId: number; error: string }

contextBridge.exposeInMainWorld('api', {
  // DB
  getConversations: () => ipcRenderer.invoke('db:conversations'),
  getMessages: (id: number) => ipcRenderer.invoke('db:messages', id),
  createConversation: (model: string) => ipcRenderer.invoke('db:createConversation', model),
  deleteConversation: (id: number) => ipcRenderer.invoke('db:deleteConversation', id),

  // Chat
  sendMessage: (payload: {
    conversationId: number
    messages: { role: string; content: string }[]
    model: string
  }) => ipcRenderer.invoke('chat:send', payload),

  exportChat: (payload: { title: string; messages: { role: string; content: string }[] }) =>
    ipcRenderer.invoke('chat:export', payload),

  // Streaming events
  onToken: (cb: (data: ApiToken) => void) => {
    const h = (_: unknown, d: ApiToken) => cb(d)
    ipcRenderer.on('chat:token', h)
    return () => ipcRenderer.removeListener('chat:token', h)
  },
  onDone: (cb: (data: ApiDone) => void) => {
    const h = (_: unknown, d: ApiDone) => cb(d)
    ipcRenderer.on('chat:done', h)
    return () => ipcRenderer.removeListener('chat:done', h)
  },
  onError: (cb: (data: ApiError) => void) => {
    const h = (_: unknown, d: ApiError) => cb(d)
    ipcRenderer.on('chat:error', h)
    return () => ipcRenderer.removeListener('chat:error', h)
  }
})

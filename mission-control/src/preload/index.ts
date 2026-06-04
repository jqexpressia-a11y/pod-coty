import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  // ── Conversations ──────────────────────────────────────────────────────────
  getConversations: () => ipcRenderer.invoke('db:conversations'),
  getMessages: (id: number) => ipcRenderer.invoke('db:messages', id),
  createConversation: (model: string) => ipcRenderer.invoke('db:createConversation', model),
  deleteConversation: (id: number) => ipcRenderer.invoke('db:deleteConversation', id),

  // ── Chat ───────────────────────────────────────────────────────────────────
  sendMessage: (p: { conversationId: number; messages: { role: string; content: string }[]; model: string }) =>
    ipcRenderer.invoke('chat:send', p),
  exportChat: (p: { title: string; messages: { role: string; content: string }[] }) =>
    ipcRenderer.invoke('chat:export', p),

  // ── Streaming events ───────────────────────────────────────────────────────
  onToken: (cb: (d: { conversationId: number; token: string }) => void) => {
    const h = (_: unknown, d: unknown) => cb(d as { conversationId: number; token: string })
    ipcRenderer.on('chat:token', h)
    return () => ipcRenderer.removeListener('chat:token', h)
  },
  onDone: (cb: (d: { conversationId: number }) => void) => {
    const h = (_: unknown, d: unknown) => cb(d as { conversationId: number })
    ipcRenderer.on('chat:done', h)
    return () => ipcRenderer.removeListener('chat:done', h)
  },
  onError: (cb: (d: { conversationId: number; error: string }) => void) => {
    const h = (_: unknown, d: unknown) => cb(d as { conversationId: number; error: string })
    ipcRenderer.on('chat:error', h)
    return () => ipcRenderer.removeListener('chat:error', h)
  },

  // ── Skills ─────────────────────────────────────────────────────────────────
  listSkills: () => ipcRenderer.invoke('skills:list'),
  addSkill: (p: { title: string; content: string }) => ipcRenderer.invoke('skills:add', p),
  useSkill: (id: number) => ipcRenderer.invoke('skills:use', id),
  deleteSkill: (id: number) => ipcRenderer.invoke('skills:delete', id),

  // ── Curator ────────────────────────────────────────────────────────────────
  runCurator: () => ipcRenderer.invoke('curator:run'),
  getCuratorReport: () => ipcRenderer.invoke('curator:report'),

  // ── Spotify ────────────────────────────────────────────────────────────────
  spotifyConnected: () => ipcRenderer.invoke('spotify:connected'),
  spotifyStatus: () => ipcRenderer.invoke('spotify:status'),
  spotifyAuthStart: () => ipcRenderer.invoke('spotify:auth-start'),
  spotifyDisconnect: () => ipcRenderer.invoke('spotify:disconnect'),
  spotifyPlay: () => ipcRenderer.invoke('spotify:play'),
  spotifyPause: () => ipcRenderer.invoke('spotify:pause'),
  spotifyNext: () => ipcRenderer.invoke('spotify:next'),
  spotifyPrev: () => ipcRenderer.invoke('spotify:prev'),

  onSpotifyUpdate: (cb: (track: unknown) => void) => {
    const h = (_: unknown, d: unknown) => cb(d)
    ipcRenderer.on('spotify:update', h)
    return () => ipcRenderer.removeListener('spotify:update', h)
  },
  onSpotifyAuthComplete: (cb: (r: { ok: boolean; error?: string }) => void) => {
    const h = (_: unknown, d: unknown) => cb(d as { ok: boolean; error?: string })
    ipcRenderer.once('spotify:auth-complete', h)
    return () => ipcRenderer.removeListener('spotify:auth-complete', h)
  }
})

import { app, BrowserWindow, ipcMain, dialog, session } from 'electron'
import { join, resolve } from 'path'
import { writeFileSync } from 'fs'
import net from 'net'
import Anthropic from '@anthropic-ai/sdk'
import {
  initDb,
  getConversations,
  getMessages,
  createConversation,
  updateConversationTitle,
  addMessage,
  deleteConversation,
  listSkills,
  addSkill,
  useSkill,
  deleteSkill,
  getSetting,
  setSetting,
  listKanbanTasks,
  createKanbanTask,
  moveKanbanTask,
  updateKanbanTask,
  deleteKanbanTask,
  getJournalEntry,
  saveJournalEntry,
  type Db
} from './db'
import { listVaultFiles, readVaultFile } from './vault'
import { runCurator, shouldRunCurator, getLastCuratorReport } from './curator'
import {
  startOAuthFlow,
  exchangeCode,
  refreshAccessToken,
  getCurrentTrack,
  spotifyPlay,
  spotifyPause,
  spotifyNext,
  spotifyPrev,
  type SpotifyTokens,
  type SpotifyTrack
} from './spotify'

let win: BrowserWindow | null = null
let db: Db
let spotifyTokens: SpotifyTokens | null = null
let spotifyPollTimer: ReturnType<typeof setInterval> | null = null

function createWindow(): void {
  win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#0b1120',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function startSpotifyPoll(): void {
  if (spotifyPollTimer) return
  spotifyPollTimer = setInterval(async () => {
    if (!spotifyTokens || !win) return
    try {
      const clientId = process.env.SPOTIFY_CLIENT_ID
      if (clientId && Date.now() > spotifyTokens.expires_at - 60_000) {
        spotifyTokens = await refreshAccessToken(spotifyTokens, clientId)
        setSetting(db, 'spotify_tokens', JSON.stringify(spotifyTokens))
      }
      const track = await getCurrentTrack(spotifyTokens.access_token)
      win.webContents.send('spotify:update', track)
    } catch {
      /* no active device or network error — ignore */
    }
  }, 5000)
}

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(permission === 'media')
  })

  db = initDb()

  // Restore Spotify tokens from DB
  const savedTokens = getSetting(db, 'spotify_tokens')
  if (savedTokens) {
    try {
      spotifyTokens = JSON.parse(savedTokens) as SpotifyTokens
    } catch { /* ignore */ }
  }

  createWindow()
  startSpotifyPoll()

  // Run curator in background if due
  setTimeout(() => {
    if (shouldRunCurator(db)) runCurator(db)
  }, 8000)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (spotifyPollTimer) clearInterval(spotifyPollTimer)
  if (process.platform !== 'darwin') app.quit()
})

// ── Conversations ─────────────────────────────────────────────────────────────

ipcMain.handle('db:conversations', () => getConversations(db))
ipcMain.handle('db:messages', (_e, id: number) => getMessages(db, id))
ipcMain.handle('db:createConversation', (_e, model: string) => createConversation(db, model))
ipcMain.handle('db:deleteConversation', (_e, id: number) => { deleteConversation(db, id); return { ok: true } })

// ── Provider-aware Anthropic client ──────────────────────────────────────────

function createAnthropicClient(): Anthropic {
  const provider = getSetting(db, 'provider') ?? 'anthropic'
  if (provider === 'fcc') {
    return new Anthropic({
      apiKey: 'freecc',
      baseURL: process.env.FCC_PROXY_URL ?? 'http://127.0.0.1:8082'
    })
  }
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set — add it to .env.local and restart.')
  return new Anthropic({ apiKey })
}

function checkPort(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection(port, host)
    const timer = setTimeout(() => { socket.destroy(); resolve(false) }, 1500)
    socket.on('connect', () => { clearTimeout(timer); socket.destroy(); resolve(true) })
    socket.on('error', () => { clearTimeout(timer); resolve(false) })
  })
}

// ── Chat (streaming) ──────────────────────────────────────────────────────────

ipcMain.handle(
  'chat:send',
  async (ipcEvent, payload: { conversationId: number; messages: { role: string; content: string }[]; model: string }) => {
    const { conversationId, messages, model } = payload
    const userMsg = messages[messages.length - 1]

    addMessage(db, conversationId, 'user', userMsg.content)
    if (getMessages(db, conversationId).length <= 1) {
      updateConversationTitle(db, conversationId, userMsg.content)
    }

    const client = createAnthropicClient()
    let assistantContent = ''

    try {
      const stream = client.messages.stream({
        model,
        max_tokens: 8096,
        messages: messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))
      })
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          assistantContent += chunk.delta.text
          ipcEvent.sender.send('chat:token', { conversationId, token: chunk.delta.text })
        }
      }
      addMessage(db, conversationId, 'assistant', assistantContent)
      ipcEvent.sender.send('chat:done', { conversationId })
      return { ok: true }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      ipcEvent.sender.send('chat:error', { conversationId, error: msg })
      throw err
    }
  }
)

ipcMain.handle('chat:export', async (_e, payload: { title: string; messages: { role: string; content: string }[] }) => {
  if (!win) return { saved: false }
  const { filePath } = await dialog.showSaveDialog(win, {
    defaultPath: `${payload.title.replace(/[/\\:*?"<>|]/g, '-') || 'chat'}.md`,
    filters: [{ name: 'Markdown', extensions: ['md'] }]
  })
  if (!filePath) return { saved: false }
  let md = `# ${payload.title}\n\n*Exported ${new Date().toLocaleString()}*\n\n---\n\n`
  for (const m of payload.messages) {
    md += `**${m.role === 'user' ? 'You' : 'Claude'}**\n\n${m.content}\n\n---\n\n`
  }
  writeFileSync(filePath, md, 'utf-8')
  return { saved: true, filePath }
})

// ── Skills ────────────────────────────────────────────────────────────────────

ipcMain.handle('skills:list', () => listSkills(db))
ipcMain.handle('skills:add', (_e, p: { title: string; content: string }) => {
  const id = addSkill(db, p.title, p.content)
  return { id }
})
ipcMain.handle('skills:use', (_e, id: number) => { useSkill(db, id); return { ok: true } })
ipcMain.handle('skills:delete', (_e, id: number) => { deleteSkill(db, id); return { ok: true } })

// ── Curator ───────────────────────────────────────────────────────────────────

ipcMain.handle('curator:run', () => runCurator(db))
ipcMain.handle('curator:report', () => getLastCuratorReport(db))

// ── Spotify ───────────────────────────────────────────────────────────────────

ipcMain.handle('spotify:connected', () => ({
  connected: !!spotifyTokens,
  hasClientId: !!process.env.SPOTIFY_CLIENT_ID
}))

ipcMain.handle('spotify:status', async () => {
  if (!spotifyTokens) return null
  try { return await getCurrentTrack(spotifyTokens.access_token) } catch { return null }
})

ipcMain.handle('spotify:auth-start', async () => {
  const clientId = process.env.SPOTIFY_CLIENT_ID
  if (!clientId) throw new Error('SPOTIFY_CLIENT_ID not set — add it to .env.local and restart.')

  await startOAuthFlow(clientId, async (code, port) => {
    try {
      spotifyTokens = await exchangeCode(code, clientId, port)
      setSetting(db, 'spotify_tokens', JSON.stringify(spotifyTokens))
      win?.webContents.send('spotify:auth-complete', { ok: true })
      startSpotifyPoll()
    } catch (err) {
      win?.webContents.send('spotify:auth-complete', { ok: false, error: String(err) })
    }
  })

  return { ok: true }
})

ipcMain.handle('spotify:disconnect', () => {
  spotifyTokens = null
  setSetting(db, 'spotify_tokens', '')
  return { ok: true }
})

async function withToken(fn: (token: string) => Promise<void>): Promise<{ ok: boolean }> {
  if (!spotifyTokens) return { ok: false }
  try {
    const clientId = process.env.SPOTIFY_CLIENT_ID
    if (clientId && Date.now() > spotifyTokens.expires_at - 60_000) {
      spotifyTokens = await refreshAccessToken(spotifyTokens, clientId)
      setSetting(db, 'spotify_tokens', JSON.stringify(spotifyTokens))
    }
    await fn(spotifyTokens.access_token)
    return { ok: true }
  } catch { return { ok: false } }
}

ipcMain.handle('spotify:play',  () => withToken(spotifyPlay))
ipcMain.handle('spotify:pause', () => withToken(spotifyPause))
ipcMain.handle('spotify:next',  () => withToken(spotifyNext))
ipcMain.handle('spotify:prev',  () => withToken(spotifyPrev))

// ── Provider ──────────────────────────────────────────────────────────────────

ipcMain.handle('provider:get', () => getSetting(db, 'provider') ?? 'anthropic')

ipcMain.handle('provider:set', (_e, p: string) => {
  if (p !== 'anthropic' && p !== 'fcc') throw new Error('Invalid provider')
  setSetting(db, 'provider', p)
  return { ok: true }
})

ipcMain.handle('provider:status', async () => {
  const provider = getSetting(db, 'provider') ?? 'anthropic'
  let fccReachable = false
  if (provider === 'fcc') {
    const url = new URL(process.env.FCC_PROXY_URL ?? 'http://127.0.0.1:8082')
    fccReachable = await checkPort(url.hostname, Number(url.port) || 8082)
  }
  return { provider, fccReachable }
})

// ── Kanban ────────────────────────────────────────────────────────────────────

ipcMain.handle('kanban:list', () => listKanbanTasks(db))
ipcMain.handle('kanban:create', (_e, title: string, col: string) => {
  const id = createKanbanTask(db, title, col)
  return { id }
})
ipcMain.handle('kanban:move', (_e, id: number, col: string) => {
  moveKanbanTask(db, id, col)
  return { ok: true }
})
ipcMain.handle('kanban:update', (_e, id: number, title: string, notes: string) => {
  updateKanbanTask(db, id, title, notes)
  return { ok: true }
})
ipcMain.handle('kanban:delete', (_e, id: number) => {
  deleteKanbanTask(db, id)
  return { ok: true }
})

// ── Journal ───────────────────────────────────────────────────────────────────

ipcMain.handle('journal:get', (_e, date: string) => getJournalEntry(db, date))
ipcMain.handle('journal:save', (_e, date: string, content: string) => {
  saveJournalEntry(db, date, content)
  return { ok: true }
})

// ── Vault ─────────────────────────────────────────────────────────────────────

ipcMain.handle('vault:list', () => {
  const vaultPath = process.env.OBSIDIAN_VAULT_PATH
  if (!vaultPath) return []
  return listVaultFiles(vaultPath)
})

ipcMain.handle('vault:read', (_e, filePath: string) => {
  const vaultPath = process.env.OBSIDIAN_VAULT_PATH
  if (!vaultPath) throw new Error('OBSIDIAN_VAULT_PATH not set')
  const safe = resolve(filePath)
  const base = resolve(vaultPath)
  if (!safe.startsWith(base + '/') && safe !== base) throw new Error('Access denied')
  return readVaultFile(safe)
})

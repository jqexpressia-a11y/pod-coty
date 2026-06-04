import { app, BrowserWindow, ipcMain, dialog, session } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync } from 'fs'
import Anthropic from '@anthropic-ai/sdk'
import {
  initDb,
  getConversations,
  getMessages,
  createConversation,
  updateConversationTitle,
  addMessage,
  deleteConversation,
  type Db
} from './db'

let win: BrowserWindow | null = null
let db: Db

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

app.whenReady().then(() => {
  // Allow microphone for voice input
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(permission === 'media')
  })

  db = initDb()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ── DB handlers ──────────────────────────────────────────────────────────────

ipcMain.handle('db:conversations', () => getConversations(db))

ipcMain.handle('db:messages', (_e, id: number) => getMessages(db, id))

ipcMain.handle('db:createConversation', (_e, model: string) => createConversation(db, model))

ipcMain.handle('db:deleteConversation', (_e, id: number) => {
  deleteConversation(db, id)
  return { ok: true }
})

// ── Chat handler (streaming) ──────────────────────────────────────────────────

ipcMain.handle(
  'chat:send',
  async (
    ipcEvent,
    payload: { conversationId: number; messages: { role: string; content: string }[]; model: string }
  ) => {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY is not set. Add it to a .env.local file in mission-control/ and restart.'
      )
    }

    const { conversationId, messages, model } = payload
    const userMessage = messages[messages.length - 1]

    addMessage(db, conversationId, 'user', userMessage.content)

    // Auto-title the conversation from the first user message
    const allMessages = getMessages(db, conversationId)
    if (allMessages.length <= 1) {
      updateConversationTitle(db, conversationId, userMessage.content)
    }

    const client = new Anthropic({ apiKey })
    let assistantContent = ''

    try {
      const stream = client.messages.stream({
        model,
        max_tokens: 8096,
        messages: messages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content
        }))
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

// ── Export handler ────────────────────────────────────────────────────────────

ipcMain.handle(
  'chat:export',
  async (
    _e,
    payload: {
      title: string
      messages: { role: string; content: string }[]
    }
  ) => {
    if (!win) return { saved: false }

    const { filePath } = await dialog.showSaveDialog(win, {
      defaultPath: `${payload.title.replace(/[/\\:*?"<>|]/g, '-') || 'chat'}.md`,
      filters: [{ name: 'Markdown', extensions: ['md'] }]
    })

    if (!filePath) return { saved: false }

    let md = `# ${payload.title}\n\n`
    md += `*Exported ${new Date().toLocaleString()}*\n\n---\n\n`

    for (const msg of payload.messages) {
      const speaker = msg.role === 'user' ? '**You**' : '**Claude**'
      md += `${speaker}\n\n${msg.content}\n\n---\n\n`
    }

    writeFileSync(filePath, md, 'utf-8')
    return { saved: true, filePath }
  }
)

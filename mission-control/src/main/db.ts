import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'

export type Db = ReturnType<typeof initDb>

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

export function initDb(): Database.Database {
  const dbPath = path.join(app.getPath('userData'), 'mission-control.db')
  const db = new Database(dbPath)

  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      title      TEXT    NOT NULL DEFAULT 'New Chat',
      model      TEXT    NOT NULL DEFAULT 'claude-sonnet-4-6',
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS messages (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role            TEXT    NOT NULL CHECK(role IN ('user','assistant')),
      content         TEXT    NOT NULL,
      created_at      INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_messages_conv
      ON messages(conversation_id, created_at);

    CREATE TABLE IF NOT EXISTS skills (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      title      TEXT    NOT NULL,
      content    TEXT    NOT NULL,
      use_count  INTEGER NOT NULL DEFAULT 0,
      score      REAL    NOT NULL DEFAULT 1.0,
      last_used  INTEGER,
      archived   INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)

  return db
}

// ── Conversations ─────────────────────────────────────────────────────────────

export function getConversations(db: Database.Database): Conversation[] {
  return db
    .prepare('SELECT * FROM conversations ORDER BY updated_at DESC')
    .all() as Conversation[]
}

export function getMessages(db: Database.Database, conversationId: number): Message[] {
  return db
    .prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC')
    .all(conversationId) as Message[]
}

export function createConversation(db: Database.Database, model: string): number {
  return db
    .prepare("INSERT INTO conversations (title, model) VALUES ('New Chat', ?)")
    .run(model).lastInsertRowid as number
}

export function updateConversationTitle(db: Database.Database, id: number, title: string): void {
  db.prepare('UPDATE conversations SET title = ?, updated_at = unixepoch() WHERE id = ?').run(
    title.slice(0, 80), id
  )
}

export function touchConversation(db: Database.Database, id: number): void {
  db.prepare('UPDATE conversations SET updated_at = unixepoch() WHERE id = ?').run(id)
}

export function addMessage(
  db: Database.Database,
  conversationId: number,
  role: 'user' | 'assistant',
  content: string
): number {
  const result = db
    .prepare('INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)')
    .run(conversationId, role, content)
  touchConversation(db, conversationId)
  return result.lastInsertRowid as number
}

export function deleteConversation(db: Database.Database, id: number): void {
  db.prepare('DELETE FROM conversations WHERE id = ?').run(id)
}

// ── Skills ────────────────────────────────────────────────────────────────────

export function listSkills(db: Database.Database): Skill[] {
  return db
    .prepare('SELECT * FROM skills WHERE archived = 0 ORDER BY score DESC, use_count DESC')
    .all() as Skill[]
}

export function addSkill(db: Database.Database, title: string, content: string): number {
  return db
    .prepare('INSERT INTO skills (title, content) VALUES (?, ?)')
    .run(title.slice(0, 120), content).lastInsertRowid as number
}

export function useSkill(db: Database.Database, id: number): void {
  db.prepare(
    'UPDATE skills SET use_count = use_count + 1, last_used = unixepoch() WHERE id = ?'
  ).run(id)
}

export function deleteSkill(db: Database.Database, id: number): void {
  db.prepare('DELETE FROM skills WHERE id = ?').run(id)
}

export function updateSkillScore(db: Database.Database, id: number, score: number): void {
  db.prepare('UPDATE skills SET score = ? WHERE id = ?').run(score, id)
}

export function archiveSkill(db: Database.Database, id: number): void {
  db.prepare('UPDATE skills SET archived = 1 WHERE id = ?').run(id)
}

// ── Settings ──────────────────────────────────────────────────────────────────

export function getSetting(db: Database.Database, key: string): string | null {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | { value: string }
    | undefined
  return row?.value ?? null
}

export function setSetting(db: Database.Database, key: string, value: string): void {
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value)
}

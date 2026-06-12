import { useEffect, useState } from 'react'
import { type KanbanTask } from '../types'

type Col = 'inbox' | 'active' | 'done'

const COLS: { key: Col; label: string }[] = [
  { key: 'inbox', label: 'Inbox' },
  { key: 'active', label: 'Active' },
  { key: 'done', label: 'Done' }
]

export default function KanbanPanel() {
  const [tasks, setTasks] = useState<KanbanTask[]>([])
  const [newTitle, setNewTitle] = useState('')
  const [addingIn, setAddingIn] = useState<Col | null>(null)

  const load = async () => setTasks(await window.api.kanbanList())
  useEffect(() => { load() }, [])

  const addTask = async (col: Col) => {
    const title = newTitle.trim()
    if (!title) return
    await window.api.kanbanCreate(title, col)
    setNewTitle('')
    setAddingIn(null)
    load()
  }

  const moveTask = async (id: number, col: Col) => {
    await window.api.kanbanMove(id, col)
    load()
  }

  const deleteTask = async (id: number) => {
    if (!confirm('Delete this task?')) return
    await window.api.kanbanDelete(id)
    load()
  }

  const colIndex = (col: Col) => COLS.findIndex((c) => c.key === col)

  return (
    <div className="kanban-panel">
      <div className="panel-header">
        <h2>⬡ Board</h2>
        <p>Kanban task board</p>
      </div>

      <div className="kanban-board">
        {COLS.map(({ key, label }) => {
          const colTasks = tasks.filter((t) => t.col === key)
          return (
            <div key={key} className="kanban-col">
              <div className="kanban-col-header">
                <span className="kanban-col-label">{label}</span>
                <span className="kanban-col-count">{colTasks.length}</span>
                <button className="kanban-add-btn" onClick={() => { setAddingIn(key); setNewTitle('') }}>+</button>
              </div>

              {addingIn === key && (
                <div className="kanban-add-form">
                  <input
                    autoFocus
                    className="skill-input"
                    placeholder="Task title…"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') addTask(key)
                      if (e.key === 'Escape') setAddingIn(null)
                    }}
                  />
                  <div className="kanban-form-actions">
                    <button className="skill-action-btn primary" onClick={() => addTask(key)}>Add</button>
                    <button className="skill-action-btn" onClick={() => setAddingIn(null)}>Cancel</button>
                  </div>
                </div>
              )}

              <div className="kanban-tasks">
                {colTasks.map((task) => {
                  const ci = colIndex(task.col)
                  return (
                    <div key={task.id} className="kanban-task">
                      <span className="kanban-task-title">{task.title}</span>
                      <div className="kanban-task-actions">
                        {ci > 0 && (
                          <button title="Move left" onClick={() => moveTask(task.id, COLS[ci - 1].key)}>←</button>
                        )}
                        {ci < COLS.length - 1 && (
                          <button title="Move right" onClick={() => moveTask(task.id, COLS[ci + 1].key)}>→</button>
                        )}
                        <button
                          title="Delete"
                          className="kanban-delete"
                          onClick={() => deleteTask(task.id)}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  )
                })}
                {colTasks.length === 0 && <div className="kanban-empty">Empty</div>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

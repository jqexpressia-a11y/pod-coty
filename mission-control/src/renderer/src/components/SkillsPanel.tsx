import { useCallback, useEffect, useState } from 'react'
import { type Skill, type CuratorReport } from '../types'

export default function SkillsPanel() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [report, setReport] = useState<CuratorReport | null>(null)
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [curating, setCurating] = useState(false)
  const [copied, setCopied] = useState<number | null>(null)

  const reload = useCallback(async () => {
    const [s, r] = await Promise.all([window.api.listSkills(), window.api.getCuratorReport()])
    setSkills(s)
    setReport(r)
  }, [])

  useEffect(() => { reload() }, [reload])

  async function handleAdd() {
    if (!newTitle.trim()) return
    await window.api.addSkill({ title: newTitle.trim(), content: newContent.trim() })
    setAdding(false)
    setNewTitle('')
    setNewContent('')
    reload()
  }

  async function handleUse(skill: Skill) {
    await window.api.useSkill(skill.id)
    navigator.clipboard.writeText(skill.content)
    setCopied(skill.id)
    setTimeout(() => setCopied(null), 1500)
    reload()
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this skill?')) return
    await window.api.deleteSkill(id)
    reload()
  }

  async function handleCurate() {
    setCurating(true)
    const r = await window.api.runCurator()
    setReport(r)
    setCurating(false)
    reload()
  }

  const filtered = skills.filter(
    (s) =>
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.content.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="skills-panel">
      <div className="skills-header">
        <h2>⬡ Skills Library</h2>
        <p>Saved prompts and snippets. The Curator auto-prunes unused skills every 7 days.</p>
      </div>

      <div className="skills-toolbar">
        <input
          className="skills-search"
          placeholder="Search skills…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="skill-action-btn primary" onClick={() => setAdding(true)}>
          + Add Skill
        </button>
      </div>

      {adding && (
        <div className="skill-add-form">
          <input
            className="skill-input"
            placeholder="Title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            autoFocus
          />
          <textarea
            className="skill-textarea"
            placeholder="Prompt / content…"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            rows={4}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="skill-action-btn primary" onClick={handleAdd}>Save</button>
            <button className="skill-action-btn" onClick={() => { setAdding(false); setNewTitle(''); setNewContent('') }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="skills-list">
        {filtered.length === 0 && (
          <div className="skills-empty">
            {search ? 'No skills match.' : 'No skills yet — save a prompt to get started.'}
          </div>
        )}
        {filtered.map((skill) => (
          <div key={skill.id} className="skill-card">
            <div className="skill-card-header">
              <span className="skill-title">{skill.title}</span>
              <div className="skill-meta">
                <span title="Times used">↑{skill.use_count}</span>
                <span title={`Score: ${skill.score.toFixed(2)}`}>
                  {'●'.repeat(Math.min(5, Math.round(skill.score + 1)))}
                </span>
              </div>
            </div>
            <p className="skill-preview">{skill.content.slice(0, 160)}{skill.content.length > 160 ? '…' : ''}</p>
            <div className="skill-card-actions">
              <button
                className="skill-action-btn primary"
                onClick={() => handleUse(skill)}
              >
                {copied === skill.id ? '✓ Copied' : '⎘ Copy'}
              </button>
              <button className="skill-action-btn danger" onClick={() => handleDelete(skill.id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="curator-section">
        <div className="curator-header">
          <span>🤖 The Curator</span>
          <button
            className="skill-action-btn"
            onClick={handleCurate}
            disabled={curating}
          >
            {curating ? 'Running…' : 'Run Now'}
          </button>
        </div>
        {report ? (
          <div className="curator-report">
            <span>Last run: {new Date(report.run_at).toLocaleString()}</span>
            <span>Reviewed {report.reviewed} skills · Archived {report.archived}</span>
            {report.archived_titles.length > 0 && (
              <span>Pruned: {report.archived_titles.join(', ')}</span>
            )}
          </div>
        ) : (
          <p className="curator-report">No report yet — runs automatically every 7 days.</p>
        )}
      </div>
    </div>
  )
}

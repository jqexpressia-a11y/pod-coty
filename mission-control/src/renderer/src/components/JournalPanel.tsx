import { useCallback, useEffect, useState } from 'react'

function localDate(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export default function JournalPanel() {
  const [date, setDate] = useState(localDate())
  const [content, setContent] = useState('')
  const [dirty, setDirty] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    window.api.journalGet(date).then((entry) => {
      setContent(entry?.content ?? '')
      setDirty(false)
      setSaved(false)
    })
  }, [date])

  const save = useCallback(async () => {
    await window.api.journalSave(date, content)
    setDirty(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [date, content])

  return (
    <div className="journal-panel">
      <div className="panel-header">
        <h2>⬡ Notes</h2>
        <p>Daily journal</p>
      </div>

      <div className="journal-toolbar">
        <input
          type="date"
          className="journal-date-input"
          value={date}
          onChange={(e) => { setDate(e.target.value); setDirty(false) }}
        />
        <button
          className="skill-action-btn primary"
          onClick={save}
          disabled={!dirty}
        >
          {saved ? '✓ Saved' : 'Save'}
        </button>
      </div>

      <textarea
        className="journal-textarea"
        value={content}
        placeholder={`Notes for ${date}…\n\nJot down thoughts, decisions, wins, blockers.`}
        onChange={(e) => { setContent(e.target.value); setDirty(true) }}
        onBlur={() => { if (dirty) save() }}
      />
    </div>
  )
}

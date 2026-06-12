import { useEffect, useState } from 'react'
import { type VaultFile } from '../types'

export default function VaultPanel() {
  const [files, setFiles] = useState<VaultFile[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [content, setContent] = useState('')
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    window.api.vaultList()
      .then(setFiles)
      .catch((e) => setError(String(e)))
  }, [])

  const open = async (filePath: string) => {
    try {
      const text = await window.api.vaultRead(filePath)
      setContent(text)
      setSelected(filePath)
      setError('')
    } catch (e) {
      setError(String(e))
    }
  }

  const filtered = files.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="vault-panel">
      <div className="panel-header">
        <h2>⬡ Vault</h2>
        <p>Obsidian notes browser</p>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="vault-layout">
        <div className="vault-files">
          <input
            className="skills-search"
            style={{ margin: '8px', width: 'calc(100% - 16px)' }}
            placeholder="Search files…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {files.length === 0 && !error && (
            <p className="skills-empty" style={{ padding: '16px' }}>
              Set <code>OBSIDIAN_VAULT_PATH</code> in .env.local to browse your vault.
            </p>
          )}

          {filtered.map((f) => (
            <div
              key={f.path}
              className={`vault-file-item ${selected === f.path ? 'active' : ''}`}
              onClick={() => open(f.path)}
            >
              <span className="vault-file-name">{f.name}</span>
              <span className="vault-file-size">{Math.round(f.size / 1024 * 10) / 10}k</span>
            </div>
          ))}
        </div>

        <div className="vault-content">
          {content ? (
            <pre className="vault-markdown">{content}</pre>
          ) : (
            <div className="vault-placeholder">
              <span>Select a file to read</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

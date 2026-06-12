import { readdirSync, readFileSync, statSync } from 'fs'
import path from 'path'

export interface VaultFile {
  name: string
  path: string
  size: number
  modified: number
}

export function listVaultFiles(vaultPath: string): VaultFile[] {
  const results: VaultFile[] = []

  function walk(dir: string): void {
    try {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          walk(full)
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          const stat = statSync(full)
          results.push({ name: path.relative(vaultPath, full), path: full, size: stat.size, modified: Math.floor(stat.mtimeMs) })
        }
      }
    } catch { /* skip unreadable dirs */ }
  }

  walk(vaultPath)
  return results.sort((a, b) => b.modified - a.modified)
}

export function readVaultFile(filePath: string): string {
  return readFileSync(filePath, 'utf-8')
}

import type { Db } from './db'
import { listSkills, updateSkillScore, archiveSkill, getSetting, setSetting } from './db'

export interface CuratorReport {
  run_at: string
  reviewed: number
  archived: number
  archived_titles: string[]
  notes: string[]
}

const PRUNE_MIN_AGE_DAYS = 14
const PRUNE_MAX_SCORE = 0.15
const PRUNE_MAX_USES = 2
const CURATOR_INTERVAL_DAYS = 7

export function runCurator(db: Db): CuratorReport {
  const now = Math.floor(Date.now() / 1000)
  const report: CuratorReport = {
    run_at: new Date().toISOString(),
    reviewed: 0,
    archived: 0,
    archived_titles: [],
    notes: []
  }

  const skills = listSkills(db)
  report.reviewed = skills.length

  for (const skill of skills) {
    const age_days = (now - skill.created_at) / 86400
    const days_idle = skill.last_used ? (now - skill.last_used) / 86400 : age_days
    // Decay score: uses / (idle days * 0.1 + 1)
    const score = skill.use_count / (days_idle * 0.1 + 1)
    updateSkillScore(db, skill.id, score)

    if (
      age_days > PRUNE_MIN_AGE_DAYS &&
      score < PRUNE_MAX_SCORE &&
      skill.use_count < PRUNE_MAX_USES
    ) {
      archiveSkill(db, skill.id)
      report.archived++
      report.archived_titles.push(skill.title)
      report.notes.push(
        `Archived "${skill.title}" — score ${score.toFixed(2)}, ${skill.use_count} uses`
      )
    }
  }

  setSetting(db, 'curator_last_report', JSON.stringify(report))
  setSetting(db, 'curator_last_run', String(now))

  return report
}

export function shouldRunCurator(db: Db): boolean {
  const val = getSetting(db, 'curator_last_run')
  if (!val) return true
  const daysSince = (Math.floor(Date.now() / 1000) - parseInt(val, 10)) / 86400
  return daysSince >= CURATOR_INTERVAL_DAYS
}

export function getLastCuratorReport(db: Db): CuratorReport | null {
  const val = getSetting(db, 'curator_last_report')
  if (!val) return null
  try {
    return JSON.parse(val) as CuratorReport
  } catch {
    return null
  }
}

const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' })

export function timeAgo(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  const diff = date.getTime() - Date.now()
  const abs = Math.abs(diff)

  if (abs < 60_000) return rtf.format(Math.round(diff / 1_000), 'second')
  if (abs < 3_600_000) return rtf.format(Math.round(diff / 60_000), 'minute')
  if (abs < 86_400_000) return rtf.format(Math.round(diff / 3_600_000), 'hour')
  if (abs < 2_592_000_000) return rtf.format(Math.round(diff / 86_400_000), 'day')
  if (abs < 31_536_000_000) return rtf.format(Math.round(diff / 2_592_000_000), 'month')
  return rtf.format(Math.round(diff / 31_536_000_000), 'year')
}

export function compactNumber(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    notation: value >= 1000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(value)
}

export function formatRepoSize(kilobytes: number) {
  if (kilobytes < 1024) return `${kilobytes} Ko`
  if (kilobytes < 1024 * 1024) return `${(kilobytes / 1024).toFixed(1)} Mo`
  return `${(kilobytes / 1024 / 1024).toFixed(1)} Go`
}

export function shortSha(sha?: string | null) {
  return sha?.slice(0, 7) || '—'
}

export function firstLine(value?: string | null) {
  return value?.split('\n')[0] || 'Sans message'
}

export function languagePercentages(languages: Record<string, number>) {
  const total = Object.values(languages).reduce((sum, size) => sum + size, 0)
  if (!total) return []

  return Object.entries(languages)
    .map(([name, size]) => ({ name, percent: (size / total) * 100 }))
    .sort((a, b) => b.percent - a.percent)
}

export const languageColors: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  HTML: '#e34c26',
  CSS: '#663399',
  Python: '#3572A5',
  Java: '#b07219',
  Shell: '#89e051',
  Dockerfile: '#384d54',
  Go: '#00ADD8',
  Rust: '#dea584',
  Vue: '#41b883',
  PHP: '#4F5D95',
}

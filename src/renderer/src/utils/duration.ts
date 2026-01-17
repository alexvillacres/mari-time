export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${hours}h ${minutes}m`
}

export function formatDurationForEdit(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours === 0) return `${minutes}m`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}m`
}

export function parseDuration(input: string): number | null {
  const trimmed = input.trim().toLowerCase()
  if (!trimmed) return null

  // Try "HH:MM" or "H:MM" format
  const colonMatch = trimmed.match(/^(\d+):(\d{1,2})$/)
  if (colonMatch) {
    const hours = parseInt(colonMatch[1], 10)
    const minutes = parseInt(colonMatch[2], 10)
    if (minutes < 60) {
      return hours * 3600 + minutes * 60
    }
  }

  // Try "1h 30m", "2h", "45m", "1h30m" formats
  let totalSeconds = 0
  let hasMatch = false

  const hourMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*h/)
  if (hourMatch) {
    totalSeconds += parseFloat(hourMatch[1]) * 3600
    hasMatch = true
  }

  const minMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*m/)
  if (minMatch) {
    totalSeconds += parseFloat(minMatch[1]) * 60
    hasMatch = true
  }

  // Plain number = minutes
  if (!hasMatch) {
    const plainNumber = parseFloat(trimmed)
    if (!isNaN(plainNumber)) {
      return plainNumber * 60
    }
  }

  return hasMatch ? Math.round(totalSeconds) : null
}

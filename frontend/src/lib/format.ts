export function formatDate(date: string | null | undefined): string {
  if (!date) return '—'
  try {
    return new Date(date).toLocaleDateString('fr-FR')
  } catch {
    return '—'
  }
}

export function formatDateTime(date: string | null | undefined): string {
  if (!date) return '—'
  try {
    return new Date(date).toLocaleString('fr-FR')
  } catch {
    return '—'
  }
}

/**
 * Mappe les colonnes snake_case d'une ligne SQL vers un objet camelCase.
 * Utilisation : `mapRow(row)` ou `mapRows(rows)` dans les services.
 */
export function mapRow<T extends Record<string, any>>(row: T): Record<string, any> {
  if (!row) return row
  const result: Record<string, any> = {}
  for (const key of Object.keys(row)) {
    result[snakeToCamel(key)] = row[key]
  }
  return result
}

export function mapRows<T extends Record<string, any>>(rows: T[]): Record<string, any>[] {
  if (!rows) return rows
  return rows.map(mapRow)
}

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

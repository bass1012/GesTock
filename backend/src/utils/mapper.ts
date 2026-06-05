/**
 * Mappe les colonnes snake_case d'une ligne SQL vers un objet camelCase.
 * Utilisation : `mapRow(row)` ou `mapRows(rows)` dans les services.
 */
export function mapRow<T = any>(row: any): T {
  if (!row) return row
  const result: any = {}
  for (const key of Object.keys(row)) {
    result[snakeToCamel(key)] = row[key]
  }
  return result as T
}

export function mapRows<T = any>(rows: any[]): T[] {
  if (!rows) return rows
  return rows.map((r) => mapRow<T>(r))
}

export function toSnake<T extends Record<string, any>>(row: T): Record<string, any> {
  if (!row) return row
  const result: Record<string, any> = {}
  for (const key of Object.keys(row)) {
    result[camelToSnake(key)] = row[key]
  }
  return result
}

export function toSnakeRows<T extends Record<string, any>>(rows: T[]): Record<string, any>[] {
  if (!rows) return rows
  return rows.map(toSnake)
}

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
}

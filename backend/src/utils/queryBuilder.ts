export class SqlQueryBuilder {
  private conditions: string[] = []
  private params: any[] = []

  constructor() {}

  /**
   * Adds a WHERE condition. If parameters are provided, replaces '?' placeholders with indexed PostgreSQL parameters ($1, $2, etc.).
   */
  where(condition: string, ...bindParams: any[]): this {
    let formattedCondition = condition
    let paramIndex = 0

    // Replace '?' with indexed placeholders ($1, $2, etc.)
    formattedCondition = condition.replace(/\?/g, () => {
      if (paramIndex >= bindParams.length) {
        throw new Error(`Not enough parameters provided for condition: "${condition}"`)
      }
      this.params.push(bindParams[paramIndex++])
      return `$${this.params.length}`
    })

    if (paramIndex < bindParams.length) {
      throw new Error(`Too many parameters provided for condition: "${condition}"`)
    }

    this.conditions.push(formattedCondition)
    return this
  }

  /**
   * Binds a value to the params array and returns the indexed parameter placeholder (e.g. "$3")
   */
  addParam(value: any): string {
    this.params.push(value)
    return `$${this.params.length}`
  }

  /**
   * Generates the WHERE clause. Returns 'WHERE cond1 AND cond2' or an empty string.
   */
  buildWhere(): string {
    if (this.conditions.length === 0) {
      return ''
    }
    return `WHERE ${this.conditions.join(' AND ')}`
  }

  /**
   * Returns the list of bound parameters.
   */
  getParams(): any[] {
    return this.params
  }
}

import { SqlQueryBuilder } from '../utils/queryBuilder'

describe('SqlQueryBuilder', () => {
  it('should build empty where clause when no conditions added', () => {
    const builder = new SqlQueryBuilder()
    expect(builder.buildWhere()).toBe('')
    expect(builder.getParams()).toEqual([])
  })

  it('should build simple conditions without parameters', () => {
    const builder = new SqlQueryBuilder()
    builder.where('is_deleted = false')
    expect(builder.buildWhere()).toBe('WHERE is_deleted = false')
    expect(builder.getParams()).toEqual([])
  })

  it('should bind parameters replacing ? with indexed placeholders', () => {
    const builder = new SqlQueryBuilder()
    builder.where('id = ?', '123')
    builder.where('name = ?', 'John')
    expect(builder.buildWhere()).toBe('WHERE id = $1 AND name = $2')
    expect(builder.getParams()).toEqual(['123', 'John'])
  })

  it('should support multiple ? placeholders in a single condition', () => {
    const builder = new SqlQueryBuilder()
    builder.where('(name ILIKE ? OR sku ILIKE ?)', '%test%', '%test%')
    expect(builder.buildWhere()).toBe('WHERE (name ILIKE $1 OR sku ILIKE $2)')
    expect(builder.getParams()).toEqual(['%test%', '%test%'])
  })

  it('should add parameters using addParam', () => {
    const builder = new SqlQueryBuilder()
    const limitPlaceholder = builder.addParam(10)
    const offsetPlaceholder = builder.addParam(20)
    expect(limitPlaceholder).toBe('$1')
    expect(offsetPlaceholder).toBe('$2')
    expect(builder.getParams()).toEqual([10, 20])
  })

  it('should raise errors when parameter count mismatch', () => {
    const builder = new SqlQueryBuilder()
    expect(() => builder.where('id = ?')).toThrow()
    expect(() => builder.where('id = ?', '1', '2')).toThrow()
  })
})

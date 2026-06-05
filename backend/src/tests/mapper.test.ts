import { mapRow, mapRows, toSnake, toSnakeRows } from '../utils/mapper'

describe('mapRow', () => {
  it('convertit snake_case en camelCase', () => {
    const row = { first_name: 'Jean', last_name: 'Dupont', tenant_id: 'abc' }
    const result = mapRow(row)
    expect(result.firstName).toBe('Jean')
    expect(result.lastName).toBe('Dupont')
    expect(result.tenantId).toBe('abc')
  })

  it('ne modifie pas les cles sans underscore', () => {
    const row = { id: '1', name: 'Test', email: 'a@b.com' }
    const result = mapRow(row)
    expect(result.id).toBe('1')
    expect(result.name).toBe('Test')
    expect(result.email).toBe('a@b.com')
  })

  it('retourne null/undefined tel quel', () => {
    expect(mapRow(null as any)).toBeNull()
    expect(mapRow(undefined as any)).toBeUndefined()
  })

  it('gere les valeurs null dans les colonnes', () => {
    const row = { product_id: null, created_at: null }
    const result = mapRow(row)
    expect(result.productId).toBeNull()
    expect(result.createdAt).toBeNull()
  })

  it('gere les cles avec plusieurs underscores', () => {
    const row = { stock_min_level: 5, batch_expiry_date: '2024-01-01' }
    const result = mapRow(row)
    expect(result.stockMinLevel).toBe(5)
    expect(result.batchExpiryDate).toBe('2024-01-01')
  })

  it('gere les valeurs numeriques et booleennes', () => {
    const row = { current_stock: 100, is_active: true, min_stock: 0 }
    const result = mapRow(row)
    expect(result.currentStock).toBe(100)
    expect(result.isActive).toBe(true)
    expect(result.minStock).toBe(0)
  })

  it('gere un objet vide', () => {
    expect(mapRow({})).toEqual({})
  })

  it('preserve les valeurs tableau et objet imbrique', () => {
    const row = { config_data: { key: 'val' }, tags_list: [1, 2, 3] }
    const result = mapRow(row)
    expect(result.configData).toEqual({ key: 'val' })
    expect(result.tagsList).toEqual([1, 2, 3])
  })
})

describe('mapRows', () => {
  it('mappe un tableau de lignes', () => {
    const rows = [
      { first_name: 'Jean', tenant_id: 'abc' },
      { first_name: 'Marie', tenant_id: 'def' },
    ]
    const result = mapRows(rows)
    expect(result).toHaveLength(2)
    expect(result[0].firstName).toBe('Jean')
    expect(result[1].firstName).toBe('Marie')
    expect(result[0].tenantId).toBe('abc')
  })

  it('retourne un tableau vide si vide', () => {
    expect(mapRows([])).toEqual([])
  })

  it('retourne null/undefined tel quel', () => {
    expect(mapRows(null as any)).toBeNull()
    expect(mapRows(undefined as any)).toBeUndefined()
  })

  it('chaque element est correctement mappe', () => {
    const rows = [{ product_id: '1', current_stock: 50, is_active: true }]
    const result = mapRows(rows)
    expect(result[0].productId).toBe('1')
    expect(result[0].currentStock).toBe(50)
    expect(result[0].isActive).toBe(true)
  })
})

describe('toSnake', () => {
  it('convertit camelCase en snake_case', () => {
    const row = { firstName: 'Jean', lastName: 'Dupont', tenantId: 'abc' }
    const result = toSnake(row)
    expect(result.first_name).toBe('Jean')
    expect(result.last_name).toBe('Dupont')
    expect(result.tenant_id).toBe('abc')
  })

  it('ne modifie pas les cles simples', () => {
    const row = { id: '1', name: 'Test' }
    const result = toSnake(row)
    expect(result.id).toBe('1')
    expect(result.name).toBe('Test')
  })

  it('retourne null/undefined tel quel', () => {
    expect(toSnake(null as any)).toBeNull()
    expect(toSnake(undefined as any)).toBeUndefined()
  })

  it('gere un objet vide', () => {
    expect(toSnake({})).toEqual({})
  })
})

describe('toSnakeRows', () => {
  it('mappe un tableau en snake_case', () => {
    const rows = [
      { firstName: 'Jean', tenantId: 'abc' },
      { firstName: 'Marie', tenantId: 'def' },
    ]
    const result = toSnakeRows(rows)
    expect(result).toHaveLength(2)
    expect(result[0].first_name).toBe('Jean')
    expect(result[1].first_name).toBe('Marie')
    expect(result[0].tenant_id).toBe('abc')
  })

  it('retourne un tableau vide si vide', () => {
    expect(toSnakeRows([])).toEqual([])
  })

  it('retourne null/undefined tel quel', () => {
    expect(toSnakeRows(null as any)).toBeNull()
    expect(toSnakeRows(undefined as any)).toBeUndefined()
  })
})

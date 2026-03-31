import { describe, it, expect } from 'vitest'
import { validateImportRows } from './validateRows'
import type { ColumnMapping } from './validateRows'

const basicMapping: ColumnMapping = {
  name: 'Product Name',
  price: 'Price',
  sku: 'SKU',
}

describe('validateImportRows', () => {
  it('marks a valid row as new', () => {
    const rows = [{ 'Product Name': 'Apple', Price: '1.99', SKU: 'APL001' }]
    const result = validateImportRows(rows, basicMapping, new Set(), new Map())
    expect(result).toHaveLength(1)
    expect(result[0].status).toBe('new')
    expect(result[0].productData?.name).toBe('Apple')
    expect(result[0].productData?.price_cents).toBe(199)
    expect(result[0].productData?.sku).toBe('APL001')
    expect(result[0].errors).toHaveLength(0)
  })

  it('marks row as invalid when name is missing', () => {
    const rows = [{ 'Product Name': '', Price: '1.99', SKU: 'APL001' }]
    const result = validateImportRows(rows, basicMapping, new Set(), new Map())
    expect(result[0].status).toBe('invalid')
    expect(result[0].errors).toContain('name is required')
  })

  it('marks row as invalid when price is invalid', () => {
    const rows = [{ 'Product Name': 'Apple', Price: 'not-a-price', SKU: 'APL001' }]
    const result = validateImportRows(rows, basicMapping, new Set(), new Map())
    expect(result[0].status).toBe('invalid')
    expect(result[0].errors).toContain('Enter a valid price (e.g. 8.99).')
  })

  it('marks row as invalid when price is empty', () => {
    const rows = [{ 'Product Name': 'Apple', Price: '', SKU: 'APL001' }]
    const result = validateImportRows(rows, basicMapping, new Set(), new Map())
    expect(result[0].status).toBe('invalid')
    expect(result[0].errors).toContain('Enter a valid price (e.g. 8.99).')
  })

  it('marks row as duplicate when SKU exists', () => {
    const rows = [{ 'Product Name': 'Apple', Price: '1.99', SKU: 'APL001' }]
    const existingSKUs = new Set(['APL001'])
    const result = validateImportRows(rows, basicMapping, existingSKUs, new Map())
    expect(result[0].status).toBe('duplicate')
    expect(result[0].errors).toHaveLength(0)
  })

  it('handles price with $ symbol correctly (converts to cents)', () => {
    const rows = [{ 'Product Name': 'Apple', Price: '$8.99', SKU: 'APL001' }]
    const result = validateImportRows(rows, basicMapping, new Set(), new Map())
    expect(result[0].status).toBe('new')
    expect(result[0].productData?.price_cents).toBe(899)
  })

  it('resolves existing category by name', () => {
    const mapping: ColumnMapping = { ...basicMapping, category: 'Category' }
    const rows = [{ 'Product Name': 'Apple', Price: '1.99', SKU: 'APL001', Category: 'Fruit' }]
    const existingCategories = new Map([['fruit', 'cat-uuid-123']])
    const result = validateImportRows(rows, mapping, new Set(), existingCategories)
    expect(result[0].status).toBe('new')
    expect(result[0].productData?.category_id).toBe('cat-uuid-123')
    expect(result[0].productData?.category_name).toBeUndefined()
  })

  it('marks category_name for auto-creation when category not found', () => {
    const mapping: ColumnMapping = { ...basicMapping, category: 'Category' }
    const rows = [{ 'Product Name': 'Apple', Price: '1.99', SKU: 'APL001', Category: 'NewCat' }]
    const result = validateImportRows(rows, mapping, new Set(), new Map())
    expect(result[0].status).toBe('new')
    expect(result[0].productData?.category_name).toBe('NewCat')
    expect(result[0].productData?.category_id).toBeUndefined()
  })

  it('processes multiple rows and returns correct statuses', () => {
    const rows = [
      { 'Product Name': 'Apple', Price: '1.99', SKU: 'APL001' },
      { 'Product Name': '', Price: '2.99', SKU: 'BAN001' },
      { 'Product Name': 'Cherry', Price: '3.99', SKU: 'CHR001' },
    ]
    const existingSKUs = new Set(['CHR001'])
    const result = validateImportRows(rows, basicMapping, existingSKUs, new Map())
    expect(result[0].status).toBe('new')
    expect(result[1].status).toBe('invalid')
    expect(result[2].status).toBe('duplicate')
  })

  it('assigns correct rowIndex starting at 1', () => {
    const rows = [
      { 'Product Name': 'Apple', Price: '1.99', SKU: 'APL001' },
      { 'Product Name': 'Banana', Price: '0.99', SKU: 'BAN001' },
    ]
    const result = validateImportRows(rows, basicMapping, new Set(), new Map())
    expect(result[0].rowIndex).toBe(1)
    expect(result[1].rowIndex).toBe(2)
  })
})

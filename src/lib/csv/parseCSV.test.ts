import { describe, it, expect } from 'vitest'
import { parseCSVText } from './parseCSV'

describe('parseCSVText', () => {
  it('parses a basic CSV with headers', () => {
    const csv = `name,sku,price\nApple,APL001,1.99\nBanana,BAN001,0.99`
    const result = parseCSVText(csv)
    expect(result.headers).toEqual(['name', 'sku', 'price'])
    expect(result.rows).toHaveLength(2)
    expect(result.rows[0]).toEqual({ name: 'Apple', sku: 'APL001', price: '1.99' })
    expect(result.rows[1]).toEqual({ name: 'Banana', sku: 'BAN001', price: '0.99' })
  })

  it('handles quoted commas correctly', () => {
    const csv = `name,description,price\n"Apple, Red","A crisp, red apple",1.99`
    const result = parseCSVText(csv)
    expect(result.headers).toEqual(['name', 'description', 'price'])
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].name).toBe('Apple, Red')
    expect(result.rows[0].description).toBe('A crisp, red apple')
  })

  it('skips empty lines', () => {
    const csv = `name,price\nApple,1.99\n\nBanana,0.99\n`
    const result = parseCSVText(csv)
    expect(result.rows).toHaveLength(2)
  })

  it('trims header whitespace', () => {
    const csv = ` name , sku , price \nApple,APL001,1.99`
    const result = parseCSVText(csv)
    expect(result.headers).toEqual(['name', 'sku', 'price'])
  })

  it('returns empty arrays for empty CSV', () => {
    const result = parseCSVText('')
    expect(result.headers).toEqual([])
    expect(result.rows).toEqual([])
  })

  it('handles a single-column CSV', () => {
    const csv = `name\nApple\nBanana`
    const result = parseCSVText(csv)
    expect(result.headers).toEqual(['name'])
    expect(result.rows).toHaveLength(2)
  })
})

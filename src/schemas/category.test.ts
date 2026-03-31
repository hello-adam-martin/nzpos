import { describe, it, expect } from 'vitest'
import {
  CreateCategorySchema,
  UpdateCategorySchema,
  ReorderCategoriesSchema,
  DeleteCategorySchema,
} from './category'

// RFC 4122 v4 UUID (valid for Zod v4 stricter validation)
const VALID_UUID = 'a1b2c3d4-e5f6-4789-ab01-0123456789ab'

describe('CreateCategorySchema', () => {
  it('accepts a valid name', () => {
    const result = CreateCategorySchema.safeParse({ name: 'Electronics' })
    expect(result.success).toBe(true)
  })

  it('rejects an empty string with required message', () => {
    const result = CreateCategorySchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('This field is required.')
    }
  })

  it('rejects a name longer than 100 characters', () => {
    const result = CreateCategorySchema.safeParse({ name: 'a'.repeat(101) })
    expect(result.success).toBe(false)
  })

  it('accepts a name of exactly 100 characters', () => {
    const result = CreateCategorySchema.safeParse({ name: 'a'.repeat(100) })
    expect(result.success).toBe(true)
  })
})

describe('UpdateCategorySchema', () => {
  it('accepts a valid id and name', () => {
    const result = UpdateCategorySchema.safeParse({ id: VALID_UUID, name: 'Test' })
    expect(result.success).toBe(true)
  })

  it('rejects an invalid UUID', () => {
    const result = UpdateCategorySchema.safeParse({ id: 'not-a-uuid', name: 'Test' })
    expect(result.success).toBe(false)
  })

  it('rejects an empty name', () => {
    const result = UpdateCategorySchema.safeParse({ id: VALID_UUID, name: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const nameError = result.error.issues.find(i => i.path[0] === 'name')
      expect(nameError?.message).toBe('This field is required.')
    }
  })
})

describe('ReorderCategoriesSchema', () => {
  it('accepts a valid array of {id, sort_order}', () => {
    const result = ReorderCategoriesSchema.safeParse({
      categories: [{ id: VALID_UUID, sort_order: 0 }],
    })
    expect(result.success).toBe(true)
  })

  it('accepts an empty array', () => {
    const result = ReorderCategoriesSchema.safeParse({ categories: [] })
    expect(result.success).toBe(true)
  })

  it('rejects a negative sort_order', () => {
    const result = ReorderCategoriesSchema.safeParse({
      categories: [{ id: VALID_UUID, sort_order: -1 }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects a non-UUID id', () => {
    const result = ReorderCategoriesSchema.safeParse({
      categories: [{ id: 'bad-id', sort_order: 0 }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects a non-integer sort_order', () => {
    const result = ReorderCategoriesSchema.safeParse({
      categories: [{ id: VALID_UUID, sort_order: 1.5 }],
    })
    expect(result.success).toBe(false)
  })
})

describe('DeleteCategorySchema', () => {
  it('accepts a valid UUID', () => {
    const result = DeleteCategorySchema.safeParse({ id: VALID_UUID })
    expect(result.success).toBe(true)
  })

  it('rejects a non-UUID string', () => {
    const result = DeleteCategorySchema.safeParse({ id: 'not-a-uuid' })
    expect(result.success).toBe(false)
  })
})

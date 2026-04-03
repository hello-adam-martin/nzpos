import { describe, it, expect } from 'vitest'
import { validateSlug, slugify, RESERVED_SLUGS, SlugSchema } from './slugValidation'

describe('validateSlug', () => {
  it('returns valid for a well-formed slug', () => {
    expect(validateSlug('my-store')).toEqual({ valid: true })
  })

  it('rejects slug shorter than 3 characters', () => {
    const result = validateSlug('ab')
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('3-30')
  })

  it('rejects slug longer than 30 characters', () => {
    const result = validateSlug('a'.repeat(31))
    expect(result.valid).toBe(false)
  })

  it('rejects slug with uppercase letters (regex fails before reserved check)', () => {
    const result = validateSlug('Admin')
    expect(result.valid).toBe(false)
  })

  it('rejects reserved slug: admin', () => {
    const result = validateSlug('admin')
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('reserved')
  })

  it('rejects reserved slug: www', () => {
    const result = validateSlug('www')
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('reserved')
  })

  it('rejects reserved slug: api', () => {
    const result = validateSlug('api')
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('reserved')
  })

  it('rejects slug starting with a number', () => {
    const result = validateSlug('1store')
    expect(result.valid).toBe(false)
  })

  it('rejects slug with consecutive hyphens', () => {
    const result = validateSlug('my--store')
    expect(result.valid).toBe(false)
  })

  it('rejects slug with leading hyphen', () => {
    const result = validateSlug('-mystore')
    expect(result.valid).toBe(false)
  })

  it('rejects slug with trailing hyphen', () => {
    const result = validateSlug('mystore-')
    expect(result.valid).toBe(false)
  })

  it('rejects slug with underscores', () => {
    const result = validateSlug('my_store')
    expect(result.valid).toBe(false)
  })

  it('accepts a single-word slug of exactly 3 characters', () => {
    expect(validateSlug('abc')).toEqual({ valid: true })
  })

  it('accepts a slug of exactly 30 characters', () => {
    expect(validateSlug('a'.repeat(30))).toEqual({ valid: true })
  })

  it('accepts a slug with hyphens separating segments', () => {
    expect(validateSlug('my-cool-store-123')).toEqual({ valid: true })
  })
})

describe('slugify', () => {
  it('lowercases and replaces spaces with hyphens', () => {
    expect(slugify('My Supply Store')).toBe('my-supply-store')
  })

  it('collapses multiple spaces into single hyphen', () => {
    expect(slugify('  Lots   of   Spaces  ')).toBe('lots-of-spaces')
  })

  it('removes special characters, keeping alphanumeric and hyphens', () => {
    const result = slugify('Special!@#Characters')
    expect(result).toMatch(/^[a-z0-9-]+$/)
    expect(result.length).toBeGreaterThan(0)
  })

  it('truncates to 30 characters', () => {
    const result = slugify('A'.repeat(50))
    expect(result.length).toBeLessThanOrEqual(30)
  })

  it('strips leading and trailing hyphens after transform', () => {
    const result = slugify('---hello---')
    expect(result).not.toMatch(/^-/)
    expect(result).not.toMatch(/-$/)
  })
})

describe('RESERVED_SLUGS', () => {
  it('includes required reserved words', () => {
    const required = ['admin', 'www', 'api', 'app', 'signup', 'login', 'support', 'billing']
    for (const slug of required) {
      expect(RESERVED_SLUGS).toContain(slug)
    }
  })
})

describe('SlugSchema', () => {
  it('passes a valid slug', () => {
    const result = SlugSchema.safeParse('my-store')
    expect(result.success).toBe(true)
  })

  it('fails a reserved slug', () => {
    const result = SlugSchema.safeParse('admin')
    expect(result.success).toBe(false)
  })

  it('fails a slug that is too short', () => {
    const result = SlugSchema.safeParse('ab')
    expect(result.success).toBe(false)
  })
})

import { z } from 'zod'

/**
 * Reserved slugs — these cannot be used as store slugs.
 * Covers system routes, common subdomains, and platform paths.
 * Per D-10: hardcoded constant, version-controlled.
 */
export const RESERVED_SLUGS = [
  'admin',
  'www',
  'api',
  'app',
  'signup',
  'login',
  'support',
  'billing',
  'help',
  'docs',
  'status',
  'mail',
  'ftp',
  'cdn',
  'assets',
  'static',
  'dashboard',
  'account',
  'settings',
  'about',
  'contact',
  'terms',
  'privacy',
  'blog',
  'home',
  'index',
] as const

/**
 * Slug regex per D-11:
 * - Must start with a lowercase letter
 * - Followed by lowercase alphanumeric characters
 * - Hyphens allowed between segments (no consecutive, no leading/trailing)
 */
const SLUG_REGEX = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/

/**
 * Validate a slug string.
 * Returns { valid: true } on success.
 * Returns { valid: false, reason: string } on failure.
 *
 * @param slug - The slug string to validate
 * @returns { valid: true } or { valid: false, reason: string }
 */
export function validateSlug(slug: string): { valid: boolean; reason?: string } {
  if (slug.length < 3 || slug.length > 30) {
    return { valid: false, reason: 'Slug must be between 3-30 characters' }
  }

  if (!SLUG_REGEX.test(slug)) {
    return {
      valid: false,
      reason:
        'Slug must start with a letter, contain only lowercase letters, numbers, and hyphens, with no consecutive or leading/trailing hyphens',
    }
  }

  if ((RESERVED_SLUGS as readonly string[]).includes(slug)) {
    return { valid: false, reason: `"${slug}" is a reserved slug and cannot be used` }
  }

  return { valid: true }
}

/**
 * Convert a store name into a valid slug candidate.
 * Per D-01: auto-generated from store name with manual edit option.
 *
 * Steps:
 * 1. Lowercase
 * 2. Strip non-alphanumeric except spaces and hyphens
 * 3. Trim
 * 4. Replace spaces with hyphens
 * 5. Collapse consecutive hyphens to one
 * 6. Strip leading/trailing hyphens
 * 7. Truncate to 30 chars (don't cut in the middle of a trailing hyphen)
 *
 * @param name - Store name to convert to a slug
 * @returns Slugified string (may still need validation before use)
 */
export function slugify(name: string): string {
  let slug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // strip non-alphanumeric except spaces and hyphens
    .trim()
    .replace(/\s+/g, '-') // spaces to hyphens
    .replace(/-+/g, '-') // collapse consecutive hyphens
    .replace(/^-+|-+$/g, '') // strip leading/trailing hyphens

  // Truncate to 30 chars and clean up any new trailing hyphen
  if (slug.length > 30) {
    slug = slug.slice(0, 30).replace(/-+$/, '')
  }

  return slug
}

/**
 * Zod schema for slug validation.
 * Use this in Server Action input schemas.
 */
export const SlugSchema = z
  .string()
  .min(3, 'Slug must be at least 3 characters')
  .max(30, 'Slug must be at most 30 characters')
  .regex(SLUG_REGEX, 'Slug must start with a letter, contain only lowercase letters, numbers, and single hyphens')
  .refine((slug) => !(RESERVED_SLUGS as readonly string[]).includes(slug), {
    message: 'This slug is reserved and cannot be used',
  })

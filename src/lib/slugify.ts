/**
 * Generate URL-safe slug from product name.
 * Used for /products/[slug] SEO-friendly URLs.
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

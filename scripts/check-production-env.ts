#!/usr/bin/env npx tsx
/**
 * Production environment variable validator.
 * Run before deploying to catch misconfigured or missing env vars.
 *
 * Usage:
 *   npx tsx scripts/check-production-env.ts
 *   npm run check:env
 */

interface CheckResult {
  status: 'PASS' | 'FAIL' | 'WARN'
  name: string
  reason?: string
}

const results: CheckResult[] = []

function pass(name: string): void {
  results.push({ status: 'PASS', name })
  console.log(`[PASS] ${name}`)
}

function fail(name: string, reason: string): void {
  results.push({ status: 'FAIL', name, reason })
  console.log(`[FAIL] ${name}: ${reason}`)
}

function warn(name: string, reason: string): void {
  results.push({ status: 'WARN', name, reason })
  console.log(`[WARN] ${name}: ${reason}`)
}

// 1. NEXT_PUBLIC_SUPABASE_URL — must be set and must NOT contain 127.0.0.1 or localhost
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
if (!supabaseUrl) {
  fail('NEXT_PUBLIC_SUPABASE_URL', 'not set')
} else if (supabaseUrl.includes('127.0.0.1') || supabaseUrl.includes('localhost')) {
  fail('NEXT_PUBLIC_SUPABASE_URL', 'points to local instance — must use production Supabase URL')
} else {
  pass('NEXT_PUBLIC_SUPABASE_URL')
}

// 2. NEXT_PUBLIC_SUPABASE_ANON_KEY — must be set and must NOT equal 'your-anon-key'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!supabaseAnonKey) {
  fail('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'not set')
} else if (supabaseAnonKey === 'your-anon-key') {
  fail('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'still set to placeholder value')
} else {
  pass('NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

// 3. SUPABASE_SERVICE_ROLE_KEY — must be set and must NOT equal 'your-service-role-key'
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!serviceRoleKey) {
  fail('SUPABASE_SERVICE_ROLE_KEY', 'not set')
} else if (serviceRoleKey === 'your-service-role-key') {
  fail('SUPABASE_SERVICE_ROLE_KEY', 'still set to placeholder value')
} else {
  pass('SUPABASE_SERVICE_ROLE_KEY')
}

// 4. STAFF_JWT_SECRET — must be set and must be at least 64 characters (32 bytes hex)
const staffJwtSecret = process.env.STAFF_JWT_SECRET
if (!staffJwtSecret) {
  fail('STAFF_JWT_SECRET', 'not set')
} else if (staffJwtSecret.length < 64) {
  fail('STAFF_JWT_SECRET', `too short (${staffJwtSecret.length} chars) — must be at least 64 characters (32 bytes hex)`)
} else {
  pass('STAFF_JWT_SECRET')
}

// 5. STRIPE_SECRET_KEY — must be set (warn if starts with sk_test_ but do not fail)
const stripeSecretKey = process.env.STRIPE_SECRET_KEY
if (!stripeSecretKey) {
  fail('STRIPE_SECRET_KEY', 'not set')
} else if (stripeSecretKey.startsWith('sk_test_')) {
  warn('STRIPE_SECRET_KEY', 'using test key — payments are simulated, not real (expected during validation period)')
} else {
  pass('STRIPE_SECRET_KEY')
}

// 6. NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY — must be set
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
if (!stripePublishableKey) {
  fail('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'not set')
} else {
  pass('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY')
}

// 7. STRIPE_WEBHOOK_SECRET — must be set and must start with whsec_
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET
if (!stripeWebhookSecret) {
  fail('STRIPE_WEBHOOK_SECRET', 'not set')
} else if (!stripeWebhookSecret.startsWith('whsec_')) {
  fail('STRIPE_WEBHOOK_SECRET', 'must start with whsec_ — get this from Stripe Dashboard > Webhooks')
} else {
  pass('STRIPE_WEBHOOK_SECRET')
}

// Summary
const total = results.length
const passed = results.filter((r) => r.status === 'PASS').length
const failed = results.filter((r) => r.status === 'FAIL').length
const warned = results.filter((r) => r.status === 'WARN').length

console.log('')
console.log(`${passed}/${total} checks passed, ${warned} warning${warned !== 1 ? 's' : ''}`)

if (failed > 0) {
  console.log(`${failed} check${failed !== 1 ? 's' : ''} failed — fix the above issues before deploying`)
  process.exit(1)
} else {
  console.log('All checks passed. Ready to deploy.')
  process.exit(0)
}

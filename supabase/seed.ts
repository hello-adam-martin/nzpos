// Development seed script — run with: npx tsx supabase/seed.ts
// Per D-08: ONLY runs in development, production starts clean

import { createClient } from '@supabase/supabase-js'
import bcryptjs from 'bcryptjs'

// Deterministic store ID so .env.local STORE_ID survives `supabase db reset`
const DEV_STORE_ID = '00000000-0000-4000-a000-000000000001'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'your-service-role-key'
)

async function seed() {
  console.log('Seeding development database...')

  // 1. Create test owner auth user
  const { data: owner } = await supabase.auth.admin.createUser({
    email: 'owner@test.nzpos.dev',
    password: 'password123',
    email_confirm: true,
  })
  if (!owner.user) throw new Error('Failed to create owner')

  // 2. Create store with deterministic ID
  const { data: store } = await supabase
    .from('stores')
    .insert({ id: DEV_STORE_ID, name: 'Test Supplies Store', slug: 'demo', owner_auth_id: owner.user.id })
    .select('id')
    .single()
  if (!store) throw new Error('Failed to create store')

  // 2b. Create store_plans row (all features disabled by default)
  await supabase.from('store_plans').insert({
    store_id: DEV_STORE_ID,
  })
  console.log('Created store_plans row for dev store')

  // 3. Create owner staff record
  await supabase.from('staff').insert({
    store_id: store.id,
    auth_user_id: owner.user.id,
    name: 'Store Owner',
    role: 'owner',
  })

  // 3b. Set app_metadata on auth user so JWT claims work immediately
  // (custom_access_token hook should do this, but as a fallback for local dev)
  await supabase.auth.admin.updateUserById(owner.user.id, {
    app_metadata: { store_id: store.id, role: 'owner' },
  })

  // 4. Create 2 test staff with PINs (per D-07)
  const pin1Hash = await bcryptjs.hash('1234', 10)
  const pin2Hash = await bcryptjs.hash('5678', 10)

  await supabase.from('staff').insert([
    { store_id: store.id, name: 'Alice (Staff)', pin_hash: pin1Hash, role: 'staff' },
    { store_id: store.id, name: 'Bob (Staff)', pin_hash: pin2Hash, role: 'staff' },
  ])

  // 5. Create categories
  const categories = ['Cleaning', 'Linen', 'Toiletries', 'Maintenance', 'Kitchen']
  const { data: cats } = await supabase
    .from('categories')
    .insert(categories.map((name, i) => ({ store_id: store.id, name, sort_order: i })))
    .select('id, name')
  if (!cats) throw new Error('Failed to create categories')

  const catMap = Object.fromEntries(cats.map((c) => [c.name, c.id]))

  // 6. Create 25 realistic NZ supplies products (per D-07)
  const products = [
    { name: 'Surface Spray 500ml', sku: 'CLN-001', price_cents: 899, stock_quantity: 48, category: 'Cleaning', reorder_threshold: 12 },
    { name: 'Bleach 2L', sku: 'CLN-002', price_cents: 1299, stock_quantity: 36, category: 'Cleaning', reorder_threshold: 10 },
    { name: 'Microfibre Cloth 5-Pack', sku: 'CLN-003', price_cents: 1499, stock_quantity: 60, category: 'Cleaning', reorder_threshold: 15 },
    { name: 'Floor Cleaner 5L', sku: 'CLN-004', price_cents: 2499, stock_quantity: 24, category: 'Cleaning', reorder_threshold: 8 },
    { name: 'Glass Cleaner 750ml', sku: 'CLN-005', price_cents: 749, stock_quantity: 40, category: 'Cleaning', reorder_threshold: 10 },
    { name: 'Bath Towel Set', sku: 'LIN-001', price_cents: 3499, stock_quantity: 20, category: 'Linen', reorder_threshold: 5 },
    { name: 'Fitted Sheet Queen', sku: 'LIN-002', price_cents: 2999, stock_quantity: 15, category: 'Linen', reorder_threshold: 5 },
    { name: 'Pillow Cases Pair', sku: 'LIN-003', price_cents: 1999, stock_quantity: 25, category: 'Linen', reorder_threshold: 8 },
    { name: 'Hand Towel 2-Pack', sku: 'LIN-004', price_cents: 1499, stock_quantity: 30, category: 'Linen', reorder_threshold: 10 },
    { name: 'Tea Towel 3-Pack', sku: 'LIN-005', price_cents: 1299, stock_quantity: 35, category: 'Linen', reorder_threshold: 10 },
    { name: 'Shampoo 500ml', sku: 'TOI-001', price_cents: 999, stock_quantity: 50, category: 'Toiletries', reorder_threshold: 15 },
    { name: 'Conditioner 500ml', sku: 'TOI-002', price_cents: 999, stock_quantity: 45, category: 'Toiletries', reorder_threshold: 15 },
    { name: 'Body Wash 1L', sku: 'TOI-003', price_cents: 1199, stock_quantity: 40, category: 'Toiletries', reorder_threshold: 12 },
    { name: 'Hand Soap Pump', sku: 'TOI-004', price_cents: 599, stock_quantity: 60, category: 'Toiletries', reorder_threshold: 20 },
    { name: 'Toilet Rolls 12-Pack', sku: 'TOI-005', price_cents: 1099, stock_quantity: 80, category: 'Toiletries', reorder_threshold: 25 },
    { name: 'WD-40 400ml', sku: 'MNT-001', price_cents: 1499, stock_quantity: 20, category: 'Maintenance', reorder_threshold: 5 },
    { name: 'Duct Tape Silver', sku: 'MNT-002', price_cents: 899, stock_quantity: 30, category: 'Maintenance', reorder_threshold: 10 },
    { name: 'Cable Ties 100pk', sku: 'MNT-003', price_cents: 699, stock_quantity: 40, category: 'Maintenance', reorder_threshold: 10 },
    { name: 'AAA Batteries 10-Pack', sku: 'MNT-004', price_cents: 1299, stock_quantity: 35, category: 'Maintenance', reorder_threshold: 10 },
    { name: 'LED Light Bulb E27', sku: 'MNT-005', price_cents: 799, stock_quantity: 25, category: 'Maintenance', reorder_threshold: 8 },
    { name: 'Dish Liquid 1L', sku: 'KIT-001', price_cents: 499, stock_quantity: 55, category: 'Kitchen', reorder_threshold: 15 },
    { name: 'Scouring Pads 6-Pack', sku: 'KIT-002', price_cents: 399, stock_quantity: 70, category: 'Kitchen', reorder_threshold: 20 },
    { name: 'Cling Wrap 60m', sku: 'KIT-003', price_cents: 549, stock_quantity: 45, category: 'Kitchen', reorder_threshold: 12 },
    { name: 'Aluminium Foil 30m', sku: 'KIT-004', price_cents: 499, stock_quantity: 40, category: 'Kitchen', reorder_threshold: 12 },
    { name: 'Bin Bags 50L 20-Pack', sku: 'KIT-005', price_cents: 899, stock_quantity: 50, category: 'Kitchen', reorder_threshold: 15 },
  ]

  await supabase.from('products').insert(
    products.map((p) => ({
      store_id: store.id,
      name: p.name,
      sku: p.sku,
      price_cents: p.price_cents,
      stock_quantity: p.stock_quantity,
      reorder_threshold: p.reorder_threshold,
      category_id: catMap[p.category],
      is_active: true,
    }))
  )

  console.log(`Seeded: 1 store, 3 staff (owner + 2 staff), ${categories.length} categories, ${products.length} products`)
  console.log('Owner login: owner@test.nzpos.dev / password123')
  console.log('Staff PINs: Alice=1234, Bob=5678')
}

seed().catch(console.error)

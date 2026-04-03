import sharp from 'sharp'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient()

  // Verify auth — require owner or staff role (F-2.3: customers must not upload product images)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const role = user.app_metadata?.role as string | undefined
  const storeId = user.app_metadata?.store_id as string | undefined
  if (!storeId || !['owner', 'staff'].includes(role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get('image') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No image provided' }, { status: 400 })
  }

  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: 'Invalid file type. Use JPEG, PNG, or WebP.' },
      { status: 400 }
    )
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: 'File too large. Maximum 10MB.' },
      { status: 400 }
    )
  }

  // Resize with sharp to max 800x800, convert to WebP
  const buffer = Buffer.from(await file.arrayBuffer())
  const resized = await sharp(buffer)
    .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer()

  // Upload to Supabase Storage — use store_id prefix for tenant isolation (F-2.1)
  const filename = `${storeId}/${crypto.randomUUID()}.webp`
  const { error: uploadError } = await supabase.storage
    .from('product-images')
    .upload(filename, resized, {
      contentType: 'image/webp',
      upsert: false,
    })

  if (uploadError) {
    return NextResponse.json(
      { error: 'Upload failed. Check your connection and try again.' },
      { status: 500 }
    )
  }

  // Get public URL
  const { data } = supabase.storage
    .from('product-images')
    .getPublicUrl(filename)

  return NextResponse.json({ url: data.publicUrl })
}

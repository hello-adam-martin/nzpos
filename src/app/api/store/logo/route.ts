import sharp from 'sharp'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/svg+xml']

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient()

  // Verify auth — extract store_id from app_metadata
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const storeId = user.app_metadata?.store_id as string | undefined
  if (!storeId) {
    return NextResponse.json({ error: 'No store associated with this account' }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get('logo') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No logo provided' }, { status: 400 })
  }

  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: 'Invalid file type. Use JPEG, PNG, or SVG.' },
      { status: 400 }
    )
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: 'File too large. Maximum 2MB.' },
      { status: 400 }
    )
  }

  let uploadBuffer: Buffer
  let contentType: string
  let filename: string

  if (file.type === 'image/svg+xml') {
    // SVG passthrough — no sharp processing
    uploadBuffer = Buffer.from(await file.arrayBuffer())
    contentType = 'image/svg+xml'
    filename = `${storeId}/${crypto.randomUUID()}.svg`
  } else {
    // Raster: resize to 400x400 max, convert to WebP
    const buffer = Buffer.from(await file.arrayBuffer())
    uploadBuffer = await sharp(buffer)
      .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer()
    contentType = 'image/webp'
    filename = `${storeId}/${crypto.randomUUID()}.webp`
  }

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('store-logos')
    .upload(filename, uploadBuffer, {
      contentType,
      upsert: false,
    })

  if (uploadError) {
    return NextResponse.json(
      { error: 'Upload failed. Check your connection and try again.' },
      { status: 500 }
    )
  }

  // Get public URL
  const { data } = supabase.storage.from('store-logos').getPublicUrl(filename)

  return NextResponse.json({ url: data.publicUrl })
}

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { SignJWT } from 'jose'

// DEV ONLY — sets a staff_session JWT cookie for POS testing
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const secret = new TextEncoder().encode(process.env.STAFF_JWT_SECRET!)

  const token = await new SignJWT({
    store_id: '00000000-0000-0000-0000-000000000001',
    staff_id: '00000000-0000-0000-0000-000000000010',
    role: 'owner',
    name: 'Dev Owner',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret)

  const cookieStore = await cookies()
  cookieStore.set('staff_session', token, {
    httpOnly: true,
    path: '/',
    maxAge: 86400,
    sameSite: 'lax',
  })

  return NextResponse.redirect(new URL('/pos', 'http://localhost:3004'))
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isConfigured } from '@/lib/config'
export async function GET(request: NextRequest) {
  if (!isConfigured) return NextResponse.redirect(new URL('/login', request.url))
  const code = request.nextUrl.searchParams.get('code')
  const next =
    request.nextUrl.searchParams.get('next') === '/reset-password'
      ? '/reset-password'
      : '/dashboard'
  if (code) {
    const client = await createClient()
    const { error } = await client.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(new URL(next, request.url))
  }
  return NextResponse.redirect(new URL('/forgot-password', request.url))
}

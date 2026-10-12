export const isConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('https://') &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.startsWith('your-'),
)

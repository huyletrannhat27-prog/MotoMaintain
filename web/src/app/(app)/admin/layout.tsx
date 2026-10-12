import { createClient } from '@/lib/supabase/server'
import { isConfigured } from '@/lib/config'
import { redirect } from 'next/navigation'
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!isConfigured) redirect('/dashboard')
  const client = await createClient()
  const {
    data: { user },
  } = await client.auth.getUser()
  if (!user) redirect('/login')
  const { data } = await client.from('profiles').select('role').eq('id', user.id).single()
  if (data?.role !== 'admin') redirect('/dashboard')
  return children
}

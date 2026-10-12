import { createClient } from '@/lib/supabase/server'
import { isConfigured } from '@/lib/config'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { DataProvider } from '@/components/DataProvider'
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let profile = null
  if (isConfigured) {
    const client = await createClient()
    const {
      data: { user },
    } = await client.auth.getUser()
    if (!user) redirect('/login')
    const result = await client.from('profiles').select('*').eq('id', user.id).single()
    profile = result.data
  }
  return (
    <div className="app-layout">
      <Sidebar profile={profile} />
      <main className="main-content">
        <DataProvider>{children}</DataProvider>
      </main>
    </div>
  )
}

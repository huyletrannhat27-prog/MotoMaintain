'use client'
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { isConfigured } from '@/lib/config'
import { useRouter } from 'next/navigation'
import type { AppData, RecordInput, VehicleInput } from '@/lib/types'
import { createDemoData } from '../../../shared/demo'
import { upgradeDemoCatalog } from '../../../shared/knowledge'
import { saveDemoRecord, saveDemoVehicle } from '../../../shared/mutations'
import { validateRecord, validateVehicle } from '@/lib/maintenance'

type Context = {
  data: AppData
  demo: boolean
  refresh: () => Promise<void>
  saveVehicle: (input: VehicleInput, id?: string) => Promise<void>
  deleteVehicle: (id: string) => Promise<void>
  saveRecord: (input: RecordInput, id?: string) => Promise<void>
  deleteRecord: (id: string) => Promise<void>
  saveProfile: (name: string, phone: string) => Promise<void>
}
const DataContext = createContext<Context | null>(null)
const KEY = 'motomaintain-demo-v1'
export function DataProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [data, setData] = useState<AppData | null>(null)
  const [error, setError] = useState('')
  const current = useRef<AppData | null>(null)
  const busy = useRef(false)
  const generation = useRef(0)
  const commit = useCallback((next: AppData) => {
    if (!isConfigured) localStorage.setItem(KEY, JSON.stringify(next))
    current.current = next
    setData(next)
  }, [])
  const refresh = useCallback(async () => {
    const token = ++generation.current
    setError('')
    try {
      if (!isConfigured) {
        const saved = localStorage.getItem(KEY)
        let next = createDemoData()
        if (saved) {
          try {
            const parsed = JSON.parse(saved)
            if (Array.isArray(parsed.records) && Array.isArray(parsed.items) && parsed.profile)
              next = upgradeDemoCatalog(parsed)
          } catch {
            /* Reset invalid local sandbox data. */
          }
        }
        commit(next)
        return
      }
      const client = createClient()
      const { data: auth, error: authError } = await client.auth.getUser()
      if (token !== generation.current) return
      if (authError || !auth.user) {
        current.current = null
        setData(null)
        router.replace('/login')
        return
      }
      async function all(table: string) {
        const rows = []
        let cursor = ''
        for (;;) {
          let query = client.from(table).select('*').order('id').limit(500)
          if (cursor) query = query.gt('id', cursor)
          if (table === 'maintenance_records' || table === 'user_vehicles')
            query = query.eq('user_id', auth.user!.id)
          const { data, error } = await query
          if (error) throw error
          rows.push(...data)
          if (data.length < 500) return rows
          cursor = data[data.length - 1].id
        }
      }
      const [vehicles, userVehicles, items, records, parts, stores, profileResult] =
        await Promise.all([
          all('vehicles'),
          all('user_vehicles'),
          all('maintenance_items'),
          all('maintenance_records'),
          all('parts_suggestions'),
          all('honda_stores'),
          client.from('profiles').select('*').eq('id', auth.user.id).single(),
        ])
      if (profileResult.error) throw profileResult.error
      if (token !== generation.current) return
      commit({
        vehicles,
        userVehicles: userVehicles.filter((v) => v.user_id === auth.user!.id),
        items,
        records: records.filter((r) => r.user_id === auth.user!.id),
        parts,
        stores,
        profile: profileResult.data,
      } as AppData)
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Không tải được dữ liệu. Kiểm tra kết nối và cấu hình cơ sở dữ liệu.',
      )
      throw e
    }
  }, [commit, router])
  useEffect(() => {
    let active = true
    void Promise.resolve().then(() => {
      if (active) return refresh().catch(() => {})
    })
    return () => {
      active = false
    }
  }, [refresh])
  useEffect(() => {
    const onFocus = () => {
      if (!busy.current) void refresh().catch(() => {})
    }
    window.addEventListener('focus', onFocus)
    const subscription = isConfigured
      ? createClient().auth.onAuthStateChange((event) => {
          if (event === 'SIGNED_OUT') {
            generation.current++
            current.current = null
            setData(null)
            router.replace('/login')
          }
        }).data.subscription
      : null
    return () => {
      window.removeEventListener('focus', onFocus)
      subscription?.unsubscribe()
    }
  }, [refresh, router])
  async function mutate(work: (snapshot: AppData) => Promise<AppData | void>) {
    if (busy.current) throw new Error('Đang lưu, vui lòng chờ.')
    if (!current.current) throw new Error('Dữ liệu chưa sẵn sàng.')
    busy.current = true
    try {
      const next = await work(current.current)
      if (next) commit(next)
      else {
        try {
          await refresh()
        } catch {
          setError(
            'Thay đổi đã được lưu. Chưa tải lại được dữ liệu; bấm Thử lại để cập nhật màn hình, không cần lưu thêm lần nữa.',
          )
        }
      }
    } finally {
      busy.current = false
    }
  }
  if (!data)
    return (
      <div className="workspace">
        <div className="card panel" role="status">
          {error || 'Đang tải dữ liệu…'}
          {error && (
            <button className="btn btn-outline" onClick={() => void refresh().catch(() => {})}>
              Thử lại
            </button>
          )}
        </div>
      </div>
    )
  const value: Context = {
    data,
    demo: !isConfigured,
    refresh,
    saveVehicle: (input, id) =>
      mutate(async (snapshot) => {
        validateVehicle(input, snapshot.records, id)
        if (!isConfigured) return saveDemoVehicle(snapshot, input, id)
        const row = {
          ...input,
          purchase_date: input.purchase_date || null,
          year: input.year || null,
          user_id: snapshot.profile.id,
        }
        const { error } = id
          ? await createClient().from('user_vehicles').update(row).eq('id', id)
          : await createClient().from('user_vehicles').insert(row)
        if (error) throw new Error(error.message)
      }),
    deleteVehicle: (id) =>
      mutate(async (snapshot) => {
        if (!isConfigured)
          return {
            ...snapshot,
            userVehicles: snapshot.userVehicles.filter((v) => v.id !== id),
            records: snapshot.records.filter((r) => r.user_vehicle_id !== id),
          }
        const { error } = await createClient().from('user_vehicles').delete().eq('id', id)
        if (error) throw new Error(error.message)
      }),
    saveRecord: (input, id) =>
      mutate(async (snapshot) => {
        validateRecord(input, snapshot, id)
        if (!isConfigured) return saveDemoRecord(snapshot, input, id)
        const { error } = await createClient().rpc('save_maintenance_record', {
          p_id: id || null,
          p_vehicle: input.user_vehicle_id,
          p_date: input.date,
          p_km: input.km_at_maintenance,
          p_items: input.items_maintained,
          p_cost: input.cost ?? null,
          p_shop: input.shop_name || null,
          p_notes: input.notes || null,
        })
        if (error) throw new Error(error.message)
      }),
    deleteRecord: (id) =>
      mutate(async (snapshot) => {
        if (!isConfigured)
          return { ...snapshot, records: snapshot.records.filter((r) => r.id !== id) }
        const { error } = await createClient().from('maintenance_records').delete().eq('id', id)
        if (error) throw new Error(error.message)
      }),
    saveProfile: (full_name, phone) =>
      mutate(async (snapshot) => {
        if (!isConfigured)
          return { ...snapshot, profile: { ...snapshot.profile, full_name, phone } }
        const { error } = await createClient()
          .from('profiles')
          .update({ full_name, phone })
          .eq('id', snapshot.profile.id)
        if (error) throw new Error(error.message)
      }),
  }
  return (
    <DataContext.Provider value={value}>
      {!isConfigured && (
        <div className="demo-banner">
          DÙNG THỬ · Dữ liệu minh họa lưu trên trình duyệt này, chưa đồng bộ tài khoản.
        </div>
      )}
      {error && (
        <div role="alert" className="notice error">
          {error}
          <button onClick={() => void refresh().catch(() => {})}>Thử lại</button>
        </div>
      )}
      {children}
    </DataContext.Provider>
  )
}
export function useData() {
  const value = useContext(DataContext)
  if (!value) throw new Error('DataProvider is required')
  return value
}

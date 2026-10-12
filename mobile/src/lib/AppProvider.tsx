import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { AppState } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Linking from 'expo-linking'
import { supabase, configured } from './client'
import type { AppData, RecordInput, VehicleInput } from '../../../shared/types'
import { createDemoData } from '../../../shared/demo'
import { upgradeDemoCatalog } from '../../../shared/knowledge'
import { saveDemoRecord, saveDemoVehicle } from '../../../shared/mutations'
import { validateRecord, validateVehicle } from '../../../shared/maintenance'
type State = {
  data: AppData | null
  ready: boolean
  signedIn: boolean
  error: string
  demo: boolean
  recovery: boolean
  finishRecovery: () => void
  refresh: () => Promise<void>
  saveVehicle: (v: VehicleInput, id?: string) => Promise<void>
  deleteVehicle: (id: string) => Promise<void>
  saveRecord: (r: RecordInput, id?: string) => Promise<void>
  deleteRecord: (id: string) => Promise<void>
  saveProfile: (name: string, phone: string) => Promise<void>
  signOut: () => Promise<void>
}
const Context = createContext<State | null>(null)
const KEY = 'motomaintain-mobile-demo-v1'
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData | null>(null)
  const [ready, setReady] = useState(false)
  const [signedIn, setSignedIn] = useState(!configured)
  const [error, setError] = useState('')
  const [recovery, setRecovery] = useState(false)
  const snapshot = useRef<AppData | null>(null)
  const busy = useRef(false)
  const generation = useRef(0)
  const commit = useCallback(async (next: AppData) => {
    if (!configured) await AsyncStorage.setItem(KEY, JSON.stringify(next))
    snapshot.current = next
    setData(next)
  }, [])
  const refresh = useCallback(async () => {
    const token = ++generation.current
    try {
      setError('')
      if (!supabase) {
        const stored = await AsyncStorage.getItem(KEY)
        let next = createDemoData()
        if (stored) {
          try {
            const parsed = JSON.parse(stored)
            if (parsed.profile && Array.isArray(parsed.records) && Array.isArray(parsed.items))
              next = upgradeDemoCatalog(parsed)
          } catch {}
        }
        await commit(next)
        setSignedIn(true)
        return
      }
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()
      if (token !== generation.current) return
      if (error || !user) {
        snapshot.current = null
        setData(null)
        setSignedIn(false)
        return
      }
      setSignedIn(true)
      async function all(table: string) {
        const rows = []
        let cursor = ''
        for (;;) {
          let query = supabase!.from(table).select('*').order('id').limit(500)
          if (cursor) query = query.gt('id', cursor)
          if (table === 'maintenance_records' || table === 'user_vehicles')
            query = query.eq('user_id', user!.id)
          const { data, error } = await query
          if (error) throw new Error(error.message)
          rows.push(...data)
          if (data.length < 500) return rows
          cursor = data[data.length - 1].id
        }
      }
      const [vehicles, userVehicles, items, records, parts, stores, profile] = await Promise.all([
        all('vehicles'),
        all('user_vehicles'),
        all('maintenance_items'),
        all('maintenance_records'),
        all('parts_suggestions'),
        all('honda_stores'),
        supabase.from('profiles').select('*').eq('id', user.id).single(),
      ])
      if (profile.error) throw new Error(profile.error.message)
      if (token === generation.current)
        await commit({
          vehicles,
          userVehicles: userVehicles.filter((v) => v.user_id === user.id),
          items,
          records: records.filter((r) => r.user_id === user.id),
          parts,
          stores,
          profile: profile.data,
        } as AppData)
    } catch (e) {
      if (token === generation.current)
        setError(e instanceof Error ? e.message : 'Không tải được dữ liệu.')
      throw e
    } finally {
      if (token === generation.current) setReady(true)
    }
  }, [commit])
  useEffect(() => {
    void Promise.resolve()
      .then(() => refresh())
      .catch(() => {})
    if (!supabase) return
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        generation.current++
        snapshot.current = null
        setData(null)
        setSignedIn(false)
        setRecovery(false)
      } else if (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') {
        if (event === 'PASSWORD_RECOVERY') setRecovery(true)
        setTimeout(() => void refresh().catch(() => {}), 0)
      }
    })
    supabase.auth.startAutoRefresh()
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        supabase!.auth.startAutoRefresh()
        if (!busy.current) void refresh().catch(() => {})
      } else supabase!.auth.stopAutoRefresh()
    })
    return () => {
      listener.subscription.unsubscribe()
      sub.remove()
      supabase!.auth.stopAutoRefresh()
    }
  }, [refresh])
  useEffect(() => {
    async function open(url: string | null) {
      if (!url || !supabase) return
      const parsed = new URL(url)
      const hash = new URLSearchParams(parsed.hash.slice(1))
      const access_token = hash.get('access_token')
      const refresh_token = hash.get('refresh_token')
      if (access_token && refresh_token) {
        if (hash.get('type') === 'recovery') setRecovery(true)
        const { error } = await supabase.auth.setSession({ access_token, refresh_token })
        if (error) setError('Liên kết xác thực hết hạn. Hãy gửi lại email.')
      }
    }
    void Linking.getInitialURL()
      .then(open)
      .catch(() => {})
    const sub = Linking.addEventListener('url', ({ url }) => {
      void open(url).catch(() => setError('Không mở được liên kết xác thực.'))
    })
    return () => sub.remove()
  }, [])
  async function mutate(work: (value: AppData) => Promise<AppData | void>) {
    if (busy.current) throw new Error('Đang lưu, vui lòng chờ.')
    if (!snapshot.current) throw new Error('Dữ liệu chưa sẵn sàng.')
    busy.current = true
    try {
      const next = await work(snapshot.current)
      if (next) await commit(next)
      else {
        try {
          await refresh()
        } catch {
          setError(
            'Thay đổi đã được lưu. Chưa tải lại được dữ liệu; kéo xuống để cập nhật, không cần lưu thêm lần nữa.',
          )
        }
      }
    } finally {
      busy.current = false
    }
  }
  const value: State = {
    data,
    ready,
    signedIn,
    error,
    demo: !configured,
    recovery,
    finishRecovery: () => setRecovery(false),
    refresh,
    saveVehicle: (input, id) =>
      mutate(async (d) => {
        validateVehicle(input, d.records, id)
        if (!supabase) return saveDemoVehicle(d, input, id)
        const row = {
          ...input,
          purchase_date: input.purchase_date || null,
          year: input.year || null,
          user_id: d.profile.id,
        }
        const { error } = id
          ? await supabase.from('user_vehicles').update(row).eq('id', id)
          : await supabase.from('user_vehicles').insert(row)
        if (error) throw new Error(error.message)
      }),
    saveRecord: (input, id) =>
      mutate(async (d) => {
        validateRecord(input, d, id)
        if (!supabase) return saveDemoRecord(d, input, id)
        const { error } = await supabase.rpc('save_maintenance_record', {
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
    deleteVehicle: (id) =>
      mutate(async (d) => {
        if (!supabase)
          return {
            ...d,
            userVehicles: d.userVehicles.filter((v) => v.id !== id),
            records: d.records.filter((r) => r.user_vehicle_id !== id),
          }
        const { error } = await supabase.from('user_vehicles').delete().eq('id', id)
        if (error) throw new Error(error.message)
      }),
    deleteRecord: (id) =>
      mutate(async (d) => {
        if (!supabase) return { ...d, records: d.records.filter((r) => r.id !== id) }
        const { error } = await supabase.from('maintenance_records').delete().eq('id', id)
        if (error) throw new Error(error.message)
      }),
    saveProfile: (full_name, phone) =>
      mutate(async (d) => {
        if (!supabase) return { ...d, profile: { ...d.profile, full_name, phone } }
        const { error } = await supabase
          .from('profiles')
          .update({ full_name, phone })
          .eq('id', d.profile.id)
        if (error) throw new Error(error.message)
      }),
    signOut: async () => {
      if (supabase) {
        const { error } = await supabase.auth.signOut()
        if (error) throw new Error(error.message)
      }
    },
  }
  return <Context.Provider value={value}>{children}</Context.Provider>
}
export function useApp() {
  const value = useContext(Context)
  if (!value) throw new Error('Missing provider')
  return value
}
export function useData() {
  const app = useApp()
  if (!app.data) throw new Error('Dữ liệu chưa sẵn sàng.')
  return { ...app, data: app.data }
}

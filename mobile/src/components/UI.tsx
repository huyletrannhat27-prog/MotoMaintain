import { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useApp, useData } from '../lib/AppProvider'
import { statusLabels, vehicleLabel, type Urgency } from '../../../shared/maintenance'
import { groupOwnedVehicles } from '../../../shared/catalog'
export const colors = {
  bg: '#0a0a0f',
  card: '#15151f',
  border: '#303044',
  text: '#f4f1f4',
  muted: '#a1a0b9',
  accent: '#f97861',
}
export function Screen({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  const app = useApp()
  const [refreshing, setRefreshing] = useState(false)
  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={s.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={s.screen}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            app.data ? (
              <RefreshControl
                tintColor={colors.accent}
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true)
                  void app
                    .refresh()
                    .catch(() => {})
                    .finally(() => setRefreshing(false))
                }}
              />
            ) : undefined
          }
        >
          {app.demo && <Text style={s.banner}>DÙNG THỬ · Lưu trên thiết bị, chưa đồng bộ</Text>}
          <Text style={s.eyebrow}>MOTOMAINTAIN / CHĂM SÓC XE</Text>
          <Text style={s.title}>{title}</Text>
          {subtitle && <Text style={s.muted}>{subtitle}</Text>}
          {app.error && (
            <Text accessibilityRole="alert" style={s.error}>
              {app.error}
            </Text>
          )}
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
export function Card({ children }: { children: React.ReactNode }) {
  return <View style={s.card}>{children}</View>
}
export function Button({
  title,
  onPress,
  secondary = false,
  disabled = false,
}: {
  title: string
  onPress: () => void
  secondary?: boolean
  disabled?: boolean
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[s.button, secondary && s.secondary, disabled && { opacity: 0.45 }]}
    >
      <Text style={s.buttonText}>{title}</Text>
    </Pressable>
  )
}
export function Input({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 7 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#77778e"
        style={s.input}
        {...props}
      />
    </View>
  )
}
export function Status({ value }: { value: Urgency }) {
  const color = {
    overdue: '#ffa1ad',
    urgent: '#ffbb88',
    soon: '#e7ce87',
    ok: '#94d7b1',
    unknown: '#b5b2d0',
  }[value]
  return <Text style={[s.badge, { color }]}>{statusLabels[value]}</Text>
}
export function VehiclePicker({
  value,
  onChange,
  all = true,
}: {
  value: string
  onChange: (v: string) => void
  all?: boolean
}) {
  const { data } = useData()
  return (
    <View style={{ gap: 8 }}>
      <Text style={s.label}>Chọn xe</Text>
      <View style={{ gap: 10 }}>
        {all && <Button title="Tất cả" secondary={!!value} onPress={() => onChange('')} />}
        {groupOwnedVehicles(data)
          .filter((group) => group.vehicles.length)
          .map((group) => (
            <View key={group.type} style={{ gap: 6 }}>
              <Text style={s.small}>{group.label}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {group.vehicles.map((v) => (
                  <Button
                    key={v.id}
                    title={`${value === v.id ? '✓ ' : ''}${vehicleLabel(v, data)}${v.license_plate ? ' · ' + v.license_plate : ''}`}
                    secondary={value !== v.id}
                    onPress={() => onChange(v.id)}
                  />
                ))}
              </View>
            </View>
          ))}
      </View>
    </View>
  )
}
export function Loading() {
  return (
    <View style={[s.safe, { justifyContent: 'center', alignItems: 'center', gap: 20 }]}>
      <ActivityIndicator color={colors.accent} />
      <Text style={s.muted}>Đang tải garage…</Text>
    </View>
  )
}
export function ConfirmDelete({
  label,
  onConfirm,
}: {
  label: string
  onConfirm: () => Promise<void>
}) {
  const [pending, setPending] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  return (
    <View style={{ gap: 8 }}>
      <Button
        title={pending ? 'Hủy xóa' : 'Xóa'}
        secondary
        disabled={busy}
        onPress={() => setPending(!pending)}
      />
      {pending && (
        <>
          <Text style={s.muted}>{label}</Text>
          <Button
            title={busy ? 'Đang xóa…' : 'Xác nhận xóa'}
            disabled={busy}
            onPress={() => {
              setBusy(true)
              setError('')
              void onConfirm()
                .then(() => setPending(false))
                .catch((e) => setError(errorText(e)))
                .finally(() => setBusy(false))
            }}
          />
        </>
      )}
      {error && <Text style={s.error}>{error}</Text>}
    </View>
  )
}
export function errorText(e: unknown) {
  return e instanceof Error ? e.message : 'Thao tác chưa thành công. Vui lòng thử lại.'
}
export function notifyError(e: unknown) {
  Alert.alert('Chưa hoàn tất', errorText(e))
}
export const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  screen: {
    padding: 22,
    gap: 20,
    paddingBottom: 44,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  banner: {
    fontSize: 11,
    color: '#f2c498',
    padding: 12,
    backgroundColor: '#30221d',
    borderRadius: 8,
  },
  eyebrow: { fontSize: 9, color: '#df9788', letterSpacing: 1.7, fontWeight: '700' },
  title: { fontSize: 30, fontWeight: '800', color: colors.text, letterSpacing: -1 },
  heading: { fontSize: 20, fontWeight: '700', color: colors.text },
  text: { fontSize: 15, color: colors.text, lineHeight: 23 },
  muted: { fontSize: 13, color: colors.muted, lineHeight: 21 },
  small: { fontSize: 11, color: colors.muted, lineHeight: 18 },
  card: {
    padding: 20,
    gap: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  button: {
    paddingVertical: 13,
    paddingHorizontal: 17,
    backgroundColor: '#b8382b',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: { backgroundColor: '#252533', borderWidth: 1, borderColor: colors.border },
  buttonText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  input: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#1e1e2b',
    fontSize: 15,
    color: colors.text,
    minHeight: 48,
  },
  label: { fontSize: 12, color: colors.muted },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#292634',
    paddingVertical: 5,
    paddingHorizontal: 10,
    fontSize: 11,
    fontWeight: '600',
    borderRadius: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  metric: { fontSize: 30, fontWeight: '800', color: colors.text },
  error: {
    color: '#ff9caa',
    fontSize: 13,
    lineHeight: 21,
    backgroundColor: '#391f2a',
    padding: 13,
    borderRadius: 8,
  },
  success: { color: '#92d5aa', fontSize: 13, lineHeight: 21 },
  divider: { height: 1, backgroundColor: colors.border },
  check: {
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  selected: { backgroundColor: '#3b2328', borderColor: '#c46b59' },
})

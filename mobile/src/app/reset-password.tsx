import { useState } from 'react'
import { Text } from 'react-native'
import { router } from 'expo-router'
import { useApp } from '../lib/AppProvider'
import { supabase } from '../lib/client'
import { Button, Card, Input, Screen, errorText, s } from '../components/UI'
export default function ResetPassword() {
  const app = useApp()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <Screen title="Mật khẩu mới">
      <Card>
        {error && <Text style={s.error}>{error}</Text>}
        <Text style={s.muted}>Mở liên kết trong email trước khi đặt mật khẩu mới.</Text>
        <Input label="Mật khẩu mới" value={password} onChangeText={setPassword} secureTextEntry />
        <Input
          label="Nhập lại mật khẩu"
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
        />
        <Button
          title={busy ? 'Đang lưu…' : 'Lưu mật khẩu'}
          disabled={busy || !app.signedIn}
          onPress={() => {
            setBusy(true)
            setError('')
            void (async () => {
              try {
                if (!supabase) throw new Error('Chưa kết nối tài khoản.')
                if (password.length < 8 || password !== confirm)
                  throw new Error('Mật khẩu cần ít nhất 8 ký tự và khớp xác nhận.')
                const { error } = await supabase.auth.updateUser({ password })
                if (error) throw error
                app.finishRecovery()
                router.replace('/')
              } catch (e) {
                setError(errorText(e))
              } finally {
                setBusy(false)
              }
            })()
          }}
        />
        <Button
          title="Về đăng nhập"
          secondary
          onPress={() => {
            app.finishRecovery()
            router.replace('/login')
          }}
        />
      </Card>
    </Screen>
  )
}

import { useState } from 'react'
import { Redirect } from 'expo-router'
import { Text, View } from 'react-native'
import * as Linking from 'expo-linking'
import { useApp } from '../lib/AppProvider'
import { supabase } from '../lib/client'
import { Button, Card, Input, Loading, Screen, errorText, s } from '../components/UI'
export default function Login() {
  const app = useApp()
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  if (!app.ready) return <Loading />
  if (app.signedIn) return <Redirect href={app.recovery ? '/reset-password' : '/'} />
  async function submit() {
    if (!supabase) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      if (!email.trim().includes('@')) throw new Error('Nhập email hợp lệ.')
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw new Error('Email hoặc mật khẩu không đúng.')
        await app.refresh()
      } else if (mode === 'register') {
        if (password.length < 8 || password !== confirm)
          throw new Error('Mật khẩu cần ít nhất 8 ký tự và khớp xác nhận.')
        if (!name.trim()) throw new Error('Nhập họ tên của bạn.')
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: name.trim() },
            emailRedirectTo: Linking.createURL('/login'),
          },
        })
        if (error) throw error
        if (data.session) await app.refresh()
        else setNotice('Hãy mở email xác nhận để hoàn tất đăng ký.')
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: Linking.createURL('/reset-password'),
        })
        if (error) throw error
        setNotice('Nếu email đã đăng ký, bạn sẽ nhận liên kết đặt lại mật khẩu.')
      }
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Screen
      title={
        mode === 'login'
          ? 'Chào mừng trở lại'
          : mode === 'register'
            ? 'Tạo tài khoản'
            : 'Quên mật khẩu?'
      }
      subtitle="Chăm xe hôm nay. An tâm ngày mai."
    >
      <Card>
        {error && <Text style={s.error}>{error}</Text>}
        {notice && <Text style={s.success}>{notice}</Text>}
        {mode === 'register' && (
          <Input label="Họ tên" value={name} onChangeText={setName} maxLength={100} />
        )}
        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        {mode !== 'forgot' && (
          <Input
            label="Mật khẩu"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />
        )}
        {mode === 'register' && (
          <Input
            label="Nhập lại mật khẩu"
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            autoCapitalize="none"
          />
        )}
        <Button
          disabled={busy}
          title={
            busy
              ? 'Đang xử lý…'
              : mode === 'login'
                ? 'Đăng nhập'
                : mode === 'register'
                  ? 'Đăng ký'
                  : 'Gửi liên kết'
          }
          onPress={() => void submit()}
        />
      </Card>
      <View style={{ gap: 10 }}>
        {mode !== 'login' && (
          <Button
            title="← Về đăng nhập"
            secondary
            onPress={() => {
              setMode('login')
              setError('')
              setNotice('')
            }}
          />
        )}
        {mode === 'login' && (
          <>
            <Button title="Tạo tài khoản mới" secondary onPress={() => setMode('register')} />
            <Button title="Quên mật khẩu?" secondary onPress={() => setMode('forgot')} />
          </>
        )}
      </View>
    </Screen>
  )
}

import { useState } from 'react'
import { Text } from 'react-native'
import * as Linking from 'expo-linking'
import { useData } from '../../lib/AppProvider'
import { supabase } from '../../lib/client'
import { Button, Card, Input, Screen, errorText, s } from '../../components/UI'
export default function Profile() {
  const { data, saveProfile } = useData()
  const [name, setName] = useState(data.profile.full_name || '')
  const [phone, setPhone] = useState(data.profile.phone || '')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <Screen title="Tài khoản">
      <Card>
        <Text style={s.muted}>{data.profile.email}</Text>
        {error && <Text style={s.error}>{error}</Text>}
        {notice && <Text style={s.success}>{notice}</Text>}
        <Input label="Họ tên" value={name} onChangeText={setName} maxLength={100} />
        <Input
          label="Số điện thoại"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          maxLength={20}
        />
        <Button
          title={busy ? 'Đang lưu…' : 'Lưu thông tin'}
          disabled={busy}
          onPress={() => {
            setError('')
            setNotice('')
            if (!name.trim()) {
              setError('Nhập họ tên.')
              return
            }
            setBusy(true)
            void saveProfile(name.trim(), phone.trim())
              .then(() => setNotice('Đã lưu thông tin.'))
              .catch((e) => setError(errorText(e)))
              .finally(() => setBusy(false))
          }}
        />
        {supabase && (
          <Button
            title="Gửi email đổi mật khẩu"
            secondary
            disabled={busy}
            onPress={() => {
              setBusy(true)
              setError('')
              setNotice('')
              void supabase!.auth
                .resetPasswordForEmail(data.profile.email, {
                  redirectTo: Linking.createURL('/reset-password'),
                })
                .then(({ error }) => {
                  if (error) throw error
                  setNotice('Đã gửi liên kết đổi mật khẩu qua email.')
                })
                .catch((e) => setError(errorText(e)))
                .finally(() => setBusy(false))
            }}
          />
        )}
      </Card>
    </Screen>
  )
}

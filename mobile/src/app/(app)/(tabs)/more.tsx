import { router } from 'expo-router'
import { Text } from 'react-native'
import { useData } from '../../../lib/AppProvider'
import { Button, Card, Screen, notifyError, s } from '../../../components/UI'
export default function More() {
  const { data, signOut, demo } = useData()
  return (
    <Screen title="Tiện ích" subtitle="Mọi thứ cho hành trình chăm sóc xe.">
      <Card>
        <Text style={s.heading}>{data.profile.full_name || 'Tài khoản của bạn'}</Text>
        <Text style={s.muted}>{data.profile.email}</Text>
      </Card>
      <Button title="Lịch bảo dưỡng →" secondary onPress={() => router.push('/schedule')} />
      <Button title="Thông tin bảo dưỡng →" secondary onPress={() => router.push('/info')} />
      <Button title="Cửa hàng dịch vụ →" secondary onPress={() => router.push('/stores')} />
      <Button title="Thông tin tài khoản →" secondary onPress={() => router.push('/profile')} />
      {!demo && <Button title="Đăng xuất" onPress={() => void signOut().catch(notifyError)} />}
    </Screen>
  )
}

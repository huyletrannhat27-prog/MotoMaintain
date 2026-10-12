import { Redirect, Stack } from 'expo-router'
import { Text } from 'react-native'
import { useApp } from '../../lib/AppProvider'
import { Button, Loading, Screen, s } from '../../components/UI'
export default function AppLayout() {
  const app = useApp()
  if (!app.ready) return <Loading />
  if (!app.signedIn) return <Redirect href="/login" />
  if (app.recovery) return <Redirect href="/reset-password" />
  if (!app.data)
    return (
      <Screen title="Chưa tải được dữ liệu">
        <Text style={s.muted}>Kiểm tra kết nối rồi thử lại.</Text>
        <Button title="Thử lại" onPress={() => void app.refresh().catch(() => {})} />
        <Button title="Đăng xuất" secondary onPress={() => void app.signOut()} />
      </Screen>
    )
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#15151f' },
        headerTintColor: '#f4f1f4',
        headerBackTitle: 'Quay lại',
        contentStyle: { backgroundColor: '#0a0a0f' },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="record" options={{ title: 'Ghi nhận bảo dưỡng' }} />
      <Stack.Screen name="vehicle" options={{ title: 'Hồ sơ xe' }} />
      <Stack.Screen name="schedule" options={{ title: 'Lịch bảo dưỡng' }} />
      <Stack.Screen name="info" options={{ title: 'Thông tin bảo dưỡng' }} />
      <Stack.Screen name="stores" options={{ title: 'Cửa hàng dịch vụ' }} />
      <Stack.Screen name="profile" options={{ title: 'Tài khoản' }} />
    </Stack>
  )
}

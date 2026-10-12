import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { AppProvider } from '../lib/AppProvider'
export default function RootLayout() {
  return (
    <AppProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0a0a0f' } }} />
    </AppProvider>
  )
}

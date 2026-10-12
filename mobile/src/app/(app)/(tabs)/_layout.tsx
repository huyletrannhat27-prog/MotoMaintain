import { Tabs } from 'expo-router'
import { Text } from 'react-native'
const icons: Record<string, string> = {
  index: '◈',
  vehicles: '◇',
  tips: '✦',
  history: '◷',
  more: '☰',
}
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: '#15151f', borderTopColor: '#303044' },
        tabBarActiveTintColor: '#fa947d',
        tabBarInactiveTintColor: '#9391aa',
        tabBarLabelStyle: { fontSize: 10 },
        tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 23 }}>{icons[route.name]}</Text>,
      })}
    >
      <Tabs.Screen name="index" options={{ title: 'Tổng quan' }} />
      <Tabs.Screen name="vehicles" options={{ title: 'Xe của tôi' }} />
      <Tabs.Screen name="tips" options={{ title: 'Gợi ý' }} />
      <Tabs.Screen name="history" options={{ title: 'Lịch sử' }} />
      <Tabs.Screen name="more" options={{ title: 'Khác' }} />
    </Tabs>
  )
}

import { router } from 'expo-router'
import { Text, View } from 'react-native'
import { useData } from '../../../lib/AppProvider'
import { Button, Card, Screen, Status, s } from '../../../components/UI'
import { recommendations, money, vehicleLabel, km } from '../../../../../shared/maintenance'
export default function Dashboard() {
  const { data } = useData()
  const tips = recommendations(data)
  const due = tips.filter((t) => t.urgency === 'overdue' || t.urgency === 'urgent')
  return (
    <Screen
      title={`Chào ${data.profile.full_name || 'bạn'} 👋`}
      subtitle="Chăm xe đều đặn, an tâm mỗi hành trình."
    >
      <Button title="+ Ghi nhận bảo dưỡng" onPress={() => router.push('/record')} />
      <Card>
        <View style={s.row}>
          <View>
            <Text style={s.metric}>{data.userVehicles.length}</Text>
            <Text style={s.muted}>Xe đang theo dõi</Text>
          </View>
          <View>
            <Text style={s.metric}>{data.records.length}</Text>
            <Text style={s.muted}>Lần bảo dưỡng</Text>
          </View>
        </View>
        <View style={s.divider} />
        <Text style={s.muted}>Tổng chi phí đã ghi nhận</Text>
        <Text style={s.heading}>
          {money(data.records.reduce((sum, r) => sum + (r.cost || 0), 0))}
        </Text>
      </Card>
      <Text style={s.heading}>Cần chú ý hôm nay</Text>
      {due.slice(0, 4).map((t) => (
        <Card key={t.vehicle.id + t.item.id}>
          <Status value={t.urgency} />
          <Text style={s.heading}>{t.item.name}</Text>
          <Text style={s.muted}>
            {vehicleLabel(t.vehicle, data)} · {t.reason}
          </Text>
          <Button
            title="Xem gợi ý"
            secondary
            onPress={() => router.push({ pathname: '/tips', params: { vehicle: t.vehicle.id } })}
          />
        </Card>
      ))}
      {!due.length && (
        <Text style={s.muted}>Chưa có hạng mục đến hạn trong các xe đủ lịch sử.</Text>
      )}
      {tips.some((t) => t.urgency === 'unknown') && (
        <Text style={s.muted}>
          Một số hạng mục chưa có lịch sử. Bổ sung để xác định mốc tiếp theo.
        </Text>
      )}
      <Text style={s.heading}>Garage của bạn</Text>
      {data.userVehicles.map((v) => (
        <Card key={v.id}>
          <Text style={s.heading}>{vehicleLabel(v, data)}</Text>
          <Text style={s.muted}>
            {v.license_plate || 'Chưa có biển số'} · {km(v.current_km)}
          </Text>
          <Button
            title="Hồ sơ xe →"
            secondary
            onPress={() => router.push({ pathname: '/vehicle', params: { id: v.id } })}
          />
        </Card>
      ))}
      {!data.userVehicles.length && (
        <Button title="Thêm xe đầu tiên" onPress={() => router.push('/vehicle')} />
      )}
    </Screen>
  )
}

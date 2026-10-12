import { Text, View } from 'react-native'
import { router } from 'expo-router'
import { useData } from '../../../lib/AppProvider'
import { Button, Card, Screen, s } from '../../../components/UI'
import { km, vehicleLabel } from '../../../../../shared/maintenance'
import { groupOwnedVehicles } from '../../../../../shared/catalog'
export default function Vehicles() {
  const { data } = useData()
  return (
    <Screen title="Xe của tôi" subtitle="Mỗi chiếc xe, một hồ sơ riêng.">
      <Button title="+ Thêm xe mới" onPress={() => router.push('/vehicle')} />
      <Text style={s.muted}>1. Chọn xe → 2. Ghi nhận đã làm → 3. Xem nhắc nhở</Text>
      {groupOwnedVehicles(data).map((group) => (
        <View key={group.type} style={{ gap: 12 }}>
          <Text style={s.heading}>
            {group.label} ({group.vehicles.length})
          </Text>
          {group.vehicles.map((v) => (
            <Card key={v.id}>
              <Text style={s.eyebrow}>
                {data.vehicles.find((x) => x.id === v.vehicle_id)?.model}
              </Text>
              <Text style={s.heading}>{vehicleLabel(v, data)}</Text>
              <Text style={s.muted}>
                {v.license_plate || 'Chưa có biển số'} · {v.year || 'Chưa có năm'}
              </Text>
              <Text style={s.metric}>{km(v.current_km)}</Text>
              <Button
                title="Ghi nhận bảo dưỡng"
                onPress={() => router.push({ pathname: '/record', params: { vehicle: v.id } })}
              />
              <Button
                title="Xem hồ sơ / cập nhật"
                secondary
                onPress={() => router.push({ pathname: '/vehicle', params: { id: v.id } })}
              />
              <Button
                title="Gợi ý bảo dưỡng"
                secondary
                onPress={() => router.push({ pathname: '/tips', params: { vehicle: v.id } })}
              />
            </Card>
          ))}
          {!group.vehicles.length && <Text style={s.muted}>Chưa có xe trong nhóm này.</Text>}
        </View>
      ))}
      {!data.userVehicles.length && (
        <Card>
          <Text style={s.heading}>Garage đang trống</Text>
          <Text style={s.muted}>Thêm chiếc xe đầu tiên để bắt đầu theo dõi.</Text>
        </Card>
      )}
    </Screen>
  )
}

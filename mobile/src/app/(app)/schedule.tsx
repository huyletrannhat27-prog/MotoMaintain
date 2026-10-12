import { useState } from 'react'
import { Text } from 'react-native'
import { router } from 'expo-router'
import { useData } from '../../lib/AppProvider'
import { Button, Card, Input, Screen, Status, VehiclePicker, s } from '../../components/UI'
import { dateLabel, recommendations, vehicleLabel } from '../../../../shared/maintenance'
export default function Schedule() {
  const { data } = useData()
  const [vehicle, setVehicle] = useState('')
  const [month, setMonth] = useState('')
  const tips = recommendations(data)
    .filter(
      (t) =>
        (!vehicle || t.vehicle.id === vehicle) &&
        t.nextDate &&
        (!month || t.nextDate.startsWith(month)),
    )
    .sort((a, b) => a.nextDate!.localeCompare(b.nextDate!))
  return (
    <Screen title="Lịch bảo dưỡng" subtitle="Mốc theo thời gian; số km có thể đến hạn sớm hơn.">
      <VehiclePicker value={vehicle} onChange={setVehicle} />
      <Input
        label="Lọc tháng (YYYY-MM), để trống xem tất cả"
        value={month}
        onChangeText={setMonth}
        placeholder="2026-10"
        maxLength={7}
      />
      {tips.map((t) => (
        <Card key={t.vehicle.id + t.item.id}>
          <Status value={t.urgency} />
          <Text style={s.heading}>{dateLabel(t.nextDate)}</Text>
          <Text style={s.text}>{t.item.name}</Text>
          <Text style={s.muted}>
            {vehicleLabel(t.vehicle, data)} · {t.reason}
          </Text>
          <Button
            title="Ghi nhận đã thực hiện"
            onPress={() =>
              router.push({
                pathname: '/record',
                params: { vehicle: t.vehicle.id, item: t.item.id },
              })
            }
          />
        </Card>
      ))}
      {!tips.length && (
        <Text style={s.muted}>
          Chưa có mốc phù hợp. Bổ sung lịch sử để tính những hạng mục còn thiếu.
        </Text>
      )}
    </Screen>
  )
}

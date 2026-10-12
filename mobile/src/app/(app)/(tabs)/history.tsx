import { useState } from 'react'
import { Text } from 'react-native'
import { router } from 'expo-router'
import { useData } from '../../../lib/AppProvider'
import {
  Button,
  Card,
  ConfirmDelete,
  Input,
  Screen,
  VehiclePicker,
  s,
} from '../../../components/UI'
import { dateLabel, km, money, vehicleLabel } from '../../../../../shared/maintenance'
export default function History() {
  const { data, deleteRecord } = useData()
  const [vehicle, setVehicle] = useState('')
  const [search, setSearch] = useState('')
  const [month, setMonth] = useState('')
  const records = data.records
    .filter(
      (r) =>
        (!vehicle || r.user_vehicle_id === vehicle) &&
        (!month || r.date.startsWith(month)) &&
        [
          r.shop_name,
          r.notes,
          ...r.items_maintained.map((id) => data.items.find((i) => i.id === id)?.name),
        ]
          .join(' ')
          .toLocaleLowerCase('vi')
          .includes(search.toLocaleLowerCase('vi')),
    )
    .sort((a, b) => b.date.localeCompare(a.date))
  return (
    <Screen title="Lịch sử bảo dưỡng" subtitle="Những lần chăm sóc xe đã được lưu lại.">
      <VehiclePicker value={vehicle} onChange={setVehicle} />
      <Input label="Tìm hạng mục, cửa hàng, ghi chú" value={search} onChangeText={setSearch} />
      <Input
        label="Lọc tháng (YYYY-MM), để trống xem tất cả"
        value={month}
        onChangeText={setMonth}
        placeholder="2026-10"
        maxLength={7}
      />
      <Text style={s.muted}>
        {records.length} bản ghi · {money(records.reduce((sum, r) => sum + (r.cost || 0), 0))}
      </Text>
      {records.map((r) => {
        const v = data.userVehicles.find((v) => v.id === r.user_vehicle_id)
        return (
          <Card key={r.id}>
            <Text style={s.eyebrow}>{v ? vehicleLabel(v, data) : 'Xe đã lưu'}</Text>
            <Text style={s.heading}>{dateLabel(r.date)}</Text>
            <Text style={s.text}>
              {km(r.km_at_maintenance)} · {r.cost != null ? money(r.cost) : 'Chưa có chi phí'}
            </Text>
            <Text style={s.muted}>
              {r.items_maintained.map((id) => data.items.find((i) => i.id === id)?.name).join(', ')}
            </Text>
            <Text style={s.small}>
              {r.shop_name || 'Chưa ghi cửa hàng'}
              {r.notes ? ` · ${r.notes}` : ''}
            </Text>
            <Button
              title="Sửa bản ghi"
              secondary
              onPress={() => router.push({ pathname: '/record', params: { edit: r.id } })}
            />
            <ConfirmDelete
              label="Xóa bản ghi và tính lại gợi ý từ lịch sử còn lại?"
              onConfirm={() => deleteRecord(r.id)}
            />
          </Card>
        )
      })}
      {!records.length && <Text style={s.muted}>Chưa có bản ghi phù hợp.</Text>}
    </Screen>
  )
}

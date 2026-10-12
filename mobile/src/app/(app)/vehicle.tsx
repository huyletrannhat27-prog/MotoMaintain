import { useState } from 'react'
import { router, useLocalSearchParams } from 'expo-router'
import { Text, View } from 'react-native'
import { useData } from '../../lib/AppProvider'
import {
  Button,
  Card,
  ConfirmDelete,
  Input,
  Screen,
  Status,
  errorText,
  s,
} from '../../components/UI'
import { dateLabel, km, money, recommendations, vehicleLabel } from '../../../../shared/maintenance'
import { matchesModel, vehicleGroups } from '../../../../shared/catalog'
export default function Vehicle() {
  const { id } = useLocalSearchParams<{ id?: string }>()
  return <VehicleContent key={id || 'new'} id={id} />
}
function VehicleContent({ id }: { id?: string }) {
  const { data, saveVehicle, deleteVehicle } = useData()
  const vehicle = data.userVehicles.find((v) => v.id === id)
  const records = data.records
    .filter((r) => r.user_vehicle_id === id)
    .sort((a, b) => b.date.localeCompare(a.date))
  const [editing, setEditing] = useState(!id)
  const [model, setModel] = useState(vehicle?.vehicle_id || '')
  const [type, setType] = useState(
    data.vehicles.find((v) => v.id === vehicle?.vehicle_id)?.type || 'scooter',
  )
  const [search, setSearch] = useState('')
  const [optional, setOptional] = useState(false)
  const [name, setName] = useState(vehicle?.nickname || '')
  const [plate, setPlate] = useState(vehicle?.license_plate || '')
  const [odo, setOdo] = useState(String(vehicle?.current_km ?? 0))
  const [year, setYear] = useState(String(vehicle?.year || ''))
  const [date, setDate] = useState(vehicle?.purchase_date || '')
  const [color, setColor] = useState(vehicle?.color || '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  if (id && !vehicle)
    return (
      <Screen title="Không tìm thấy xe">
        <Button title="Về garage" onPress={() => router.replace('/vehicles')} />
      </Screen>
    )
  return (
    <Screen
      title={vehicle ? vehicleLabel(vehicle, data) : 'Thêm xe mới'}
      subtitle={
        vehicle
          ? `${plate || 'Chưa có biển số'} · ${km(vehicle.current_km)}`
          : 'Chọn đúng mẫu và đời xe của bạn.'
      }
    >
      {error && <Text style={s.error}>{error}</Text>}
      {editing ? (
        <Card>
          <Text style={s.heading}>1. Chọn loại xe</Text>
          <View style={{ gap: 8 }}>
            {vehicleGroups.map((group) => (
              <Button
                key={group.type}
                title={`${group.label} · ${group.examples}`}
                secondary={type !== group.type}
                disabled={!!id && records.length > 0}
                onPress={() => {
                  setType(group.type)
                  setModel('')
                  setSearch('')
                }}
              />
            ))}
          </View>
          <Text style={s.heading}>2. Chọn mẫu xe của bạn</Text>
          <Input
            label="Tìm mẫu xe"
            placeholder="AB, SH, Wave…"
            value={search}
            onChangeText={setSearch}
          />
          <View style={{ gap: 8 }}>
            {data.vehicles
              .filter(
                (v) =>
                  v.id === model ||
                  (v.is_active !== false &&
                    v.type === type &&
                    matchesModel(`${v.name} ${v.model}`, search)),
              )
              .map((v) => (
                <Button
                  key={v.id}
                  title={`${model === v.id ? '✓ ' : ''}${v.name} · ${v.model}`}
                  secondary={model !== v.id}
                  disabled={!!id && records.length > 0 && v.id !== model}
                  onPress={() => setModel(v.id)}
                />
              ))}
          </View>
          <Text style={s.small}>
            Chọn đúng mã/đời xe trong sách đi kèm. Mẫu minh họa chưa có lịch xác minh.
          </Text>
          <Text style={s.heading}>3. Thông tin xe</Text>
          <Input label="Tên gọi của xe" value={name} onChangeText={setName} maxLength={80} />
          <Input label="Biển số" value={plate} onChangeText={setPlate} maxLength={20} />
          <Input
            label="Số km hiện tại *"
            value={odo}
            onChangeText={setOdo}
            keyboardType="number-pad"
          />
          <Input
            label="Năm sản xuất"
            value={year}
            onChangeText={setYear}
            keyboardType="number-pad"
          />
          <Button
            title={optional ? 'Ẩn thông tin thêm' : '+ Ngày mua và màu xe (không bắt buộc)'}
            secondary
            onPress={() => setOptional(!optional)}
          />
          {optional && (
            <>
              <Input
                label="Ngày mua (YYYY-MM-DD)"
                value={date}
                onChangeText={setDate}
                placeholder="2024-06-15"
                maxLength={10}
              />
              <Input label="Màu xe" value={color} onChangeText={setColor} maxLength={40} />
            </>
          )}
          <Button
            disabled={busy}
            title={busy ? 'Đang lưu…' : 'Lưu xe'}
            onPress={() => {
              setBusy(true)
              setError('')
              void saveVehicle(
                {
                  vehicle_id: model,
                  nickname: name.trim(),
                  license_plate: plate.trim(),
                  current_km: odo.trim() ? Number(odo) : NaN,
                  year: year ? Number(year) : undefined,
                  purchase_date: date || undefined,
                  color,
                },
                id,
              )
                .then(() => {
                  if (id) setEditing(false)
                  else router.replace('/vehicles')
                })
                .catch((e) => setError(errorText(e)))
                .finally(() => setBusy(false))
            }}
          />
          {id && <Button secondary title="Hủy" onPress={() => setEditing(false)} />}
        </Card>
      ) : (
        <>
          <View style={{ gap: 10 }}>
            <Button
              title="Ghi nhận bảo dưỡng"
              onPress={() => router.push({ pathname: '/record', params: { vehicle: id } })}
            />
            <Button title="Cập nhật thông tin & số km" secondary onPress={() => setEditing(true)} />
          </View>
          <Card>
            <Text style={s.muted}>{records.length} lần bảo dưỡng</Text>
            <Text style={s.heading}>
              {money(records.reduce((sum, r) => sum + (r.cost || 0), 0))}
            </Text>
            <Text style={s.muted}>Ngày mua: {dateLabel(vehicle?.purchase_date)}</Text>
          </Card>
          <Text style={s.heading}>Tình trạng từng hạng mục</Text>
          {recommendations(data)
            .filter((t) => t.vehicle.id === id)
            .map((t) => (
              <Card key={t.item.id}>
                <Status value={t.urgency} />
                <Text style={s.text}>{t.item.name}</Text>
                <Text style={s.muted}>{t.reason}</Text>
              </Card>
            ))}
          <Text style={s.heading}>Lịch sử gần đây</Text>
          {records.slice(0, 5).map((r) => (
            <Card key={r.id}>
              <Text style={s.text}>
                {dateLabel(r.date)} · {km(r.km_at_maintenance)}
              </Text>
              <Text style={s.muted}>
                {r.items_maintained
                  .map((id) => data.items.find((i) => i.id === id)?.name)
                  .join(', ')}
              </Text>
            </Card>
          ))}
          <ConfirmDelete
            label="Xóa xe cùng toàn bộ lịch sử của xe này?"
            onConfirm={async () => {
              await deleteVehicle(id!)
              router.replace('/vehicles')
            }}
          />
        </>
      )}
    </Screen>
  )
}

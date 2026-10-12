import { useMemo, useState } from 'react'
import { router, useLocalSearchParams } from 'expo-router'
import { Pressable, Text } from 'react-native'
import { useData } from '../../lib/AppProvider'
import { Button, Card, Input, Screen, VehiclePicker, errorText, s } from '../../components/UI'
import { todayISO } from '../../../../shared/maintenance'
import { learnNoteModel, suggestNote } from '../../../../shared/learning'
export default function RecordScreen() {
  const params = useLocalSearchParams<{ edit?: string; vehicle?: string; item?: string }>()
  return <RecordForm key={JSON.stringify(params)} params={params} />
}
function RecordForm({ params }: { params: { edit?: string; vehicle?: string; item?: string } }) {
  const { data, saveRecord } = useData()
  const record = data.records.find((r) => r.id === params.edit)
  const [vehicle, setVehicle] = useState(
    record?.user_vehicle_id || params.vehicle || data.userVehicles[0]?.id || '',
  )
  const uv = data.userVehicles.find((v) => v.id === vehicle)
  const [date, setDate] = useState(record?.date || todayISO())
  const [odo, setOdo] = useState(String(record?.km_at_maintenance ?? uv?.current_km ?? ''))
  const [cost, setCost] = useState(String(record?.cost ?? ''))
  const [shop, setShop] = useState(record?.shop_name || '')
  const [notes, setNotes] = useState(record?.notes || '')
  const [items, setItems] = useState(record?.items_maintained || (params.item ? [params.item] : []))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [optional, setOptional] = useState(false)
  const noteModel = useMemo(
    () =>
      learnNoteModel(
        data.records,
        data.items.filter((i) => i.vehicle_id === uv?.vehicle_id),
        record?.id,
      ),
    [data.records, data.items, uv?.vehicle_id, record?.id],
  )
  const suggestion = suggestNote(
    notes,
    data.items.filter((i) => i.vehicle_id === uv?.vehicle_id),
    noteModel,
  )
  if (params.edit && !record)
    return (
      <Screen title="Không tìm thấy bản ghi">
        <Button title="Về lịch sử" onPress={() => router.replace('/history')} />
      </Screen>
    )
  if (saved)
    return (
      <Screen title="Đã ghi nhận!" subtitle="Mốc bảo dưỡng từng hạng mục đã được cập nhật.">
        <Button
          title="Xem gợi ý mới"
          onPress={() => router.replace({ pathname: '/tips', params: { vehicle } })}
        />
        <Button title="Xem lịch sử" secondary onPress={() => router.replace('/history')} />
      </Screen>
    )
  return (
    <Screen
      title={record ? 'Sửa bản ghi' : 'Ghi nhận bảo dưỡng'}
      subtitle="Chỉ chọn những hạng mục đã thực sự làm."
    >
      {!data.userVehicles.length ? (
        <>
          <Text style={s.muted}>Bạn cần thêm xe trước.</Text>
          <Button title="Thêm xe" onPress={() => router.push('/vehicle')} />
        </>
      ) : (
        <Card>
          {error && <Text style={s.error}>{error}</Text>}
          <Text style={s.heading}>1. Xe và ngày đã bảo dưỡng</Text>
          {!record && (
            <VehiclePicker
              all={false}
              value={vehicle}
              onChange={(id) => {
                setVehicle(id)
                setItems([])
                setOdo(String(data.userVehicles.find((v) => v.id === id)?.current_km ?? ''))
              }}
            />
          )}
          <Input
            label="Ngày bảo dưỡng (YYYY-MM-DD) *"
            value={date}
            onChangeText={setDate}
            maxLength={10}
          />
          <Input
            label="Số km khi bảo dưỡng *"
            value={odo}
            onChangeText={setOdo}
            keyboardType="number-pad"
          />
          <Text style={s.heading}>2. Chọn việc đã làm</Text>
          <Input
            label="Ghi chú để gợi ý hạng mục"
            value={notes}
            onChangeText={setNotes}
            multiline
            maxLength={2000}
            placeholder="Đã thay nhớt máy, kiểm tra phanh"
          />
          {!!notes && <Text style={s.small}>{suggestion.explanation}</Text>}
          {!!suggestion.ids.length && (
            <Button
              title={`Áp dụng gợi ý: ${data.items
                .filter((i) => suggestion.ids.includes(i.id))
                .map((i) => i.name)
                .join(', ')}`}
              secondary
              onPress={() => setItems((values) => [...new Set([...values, ...suggestion.ids])])}
            />
          )}
          <Text style={s.label}>Hạng mục đã thực hiện *</Text>
          {data.items
            .filter((i) => i.vehicle_id === uv?.vehicle_id)
            .map((i) => (
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: items.includes(i.id) }}
                key={i.id}
                style={[s.check, items.includes(i.id) && s.selected]}
                onPress={() =>
                  setItems((selected) =>
                    selected.includes(i.id)
                      ? selected.filter((id) => id !== i.id)
                      : [...selected, i.id],
                  )
                }
              >
                <Text style={s.text}>
                  {items.includes(i.id) ? '☑' : '☐'} {i.name}
                </Text>
              </Pressable>
            ))}
          {!data.items.some((i) => i.vehicle_id === uv?.vehicle_id) && (
            <Text style={s.muted}>Chưa có danh mục bảo dưỡng. Cần quản trị viên bổ sung.</Text>
          )}
          <Button
            title={optional ? 'Ẩn chi phí và cửa hàng' : '3. Thêm chi phí và cửa hàng (tùy chọn)'}
            secondary
            onPress={() => setOptional(!optional)}
          />
          {optional && (
            <>
              <Input
                label="Tổng chi phí (đ), có thể để trống"
                value={cost}
                onChangeText={setCost}
                keyboardType="number-pad"
              />
              <Input label="Cửa hàng" value={shop} onChangeText={setShop} maxLength={150} />
            </>
          )}
          <Text style={s.muted}>Đã chọn {items.length} hạng mục. Chỉ lưu việc thực sự đã làm.</Text>
          <Button
            title={busy ? 'Đang lưu…' : 'Lưu bảo dưỡng'}
            disabled={busy || !items.length}
            onPress={() => {
              setBusy(true)
              setError('')
              void saveRecord(
                {
                  user_vehicle_id: vehicle,
                  date,
                  km_at_maintenance: odo.trim() ? Number(odo) : NaN,
                  items_maintained: items,
                  cost: cost.trim() ? Number(cost) : undefined,
                  shop_name: shop.trim(),
                  notes: notes.trim(),
                },
                record?.id,
              )
                .then(() => setSaved(true))
                .catch((e) => setError(errorText(e)))
                .finally(() => setBusy(false))
            }}
          />
        </Card>
      )}
    </Screen>
  )
}

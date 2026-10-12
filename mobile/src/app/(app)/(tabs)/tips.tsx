import { useState } from 'react'
import { router, useLocalSearchParams } from 'expo-router'
import { ScrollView, Text, View } from 'react-native'
import * as Linking from 'expo-linking'
import { useData } from '../../../lib/AppProvider'
import { Button, Card, Screen, Status, VehiclePicker, notifyError, s } from '../../../components/UI'
import {
  dateLabel,
  km,
  money,
  recommendations,
  statusLabels,
  vehicleLabel,
} from '../../../../../shared/maintenance'
export default function Tips() {
  const { vehicle } = useLocalSearchParams<{ vehicle?: string }>()
  return <TipsContent key={vehicle || 'all'} initial={vehicle || ''} />
}
function TipsContent({ initial }: { initial: string }) {
  const { data } = useData()
  const [vehicle, setVehicle] = useState(initial || data.userVehicles[0]?.id || '')
  const [status, setStatus] = useState('')
  const [expanded, setExpanded] = useState<string[]>([])
  const [limit, setLimit] = useState(12)
  const tips = recommendations(data).filter(
    (t) => (!vehicle || t.vehicle.id === vehicle) && (!status || t.urgency === status),
  )
  return (
    <Screen title="Gợi ý bảo dưỡng" subtitle="Từng xe, từng hạng mục, đúng mốc tiếp theo.">
      <VehiclePicker
        all={false}
        value={vehicle}
        onChange={(id) => {
          setVehicle(id)
          setLimit(12)
        }}
      />
      <ScrollView horizontal contentContainerStyle={{ gap: 8 }}>
        <Button title="Tất cả" secondary={!!status} onPress={() => setStatus('')} />
        {Object.entries(statusLabels).map(([key, label]) => (
          <Button
            key={key}
            title={label}
            secondary={status !== key}
            onPress={() => setStatus(key)}
          />
        ))}
      </ScrollView>
      {tips.slice(0, limit).map((t) => (
        <Card key={t.vehicle.id + t.item.id}>
          <View style={s.row}>
            <Text style={s.eyebrow}>{vehicleLabel(t.vehicle, data)}</Text>
            <Status value={t.urgency} />
          </View>
          <Text style={s.heading}>{t.item.name}</Text>
          <Text style={s.muted}>{t.reason}</Text>
          <Text style={s.metric}>
            {t.nextKm != null ? km(t.nextKm) : t.nextDate ? dateLabel(t.nextDate) : 'Chưa có mốc'}
          </Text>
          {t.nextKm != null && t.nextDate && (
            <Text style={s.text}>hoặc {dateLabel(t.nextDate)}, mốc nào đến trước</Text>
          )}
          <Button
            secondary
            title={expanded.includes(t.item.id) ? 'Ẩn giải thích' : 'Xem nguồn và dự báo'}
            onPress={() =>
              setExpanded((v) =>
                v.includes(t.item.id) ? v.filter((id) => id !== t.item.id) : [...v, t.item.id],
              )
            }
          />
          {expanded.includes(t.item.id) && (
            <>
              {!t.item.verified && (
                <Text style={s.small}>Chu kỳ tham khảo, chưa xác minh cho đúng đời xe.</Text>
              )}
              <View style={{ height: 5, backgroundColor: '#303044', borderRadius: 5 }}>
                <View
                  style={{
                    height: 5,
                    width: `${t.progress}%`,
                    backgroundColor: '#ed907a',
                    borderRadius: 5,
                  }}
                />
              </View>
              <Text style={s.small}>Tiến độ chu kỳ, không phải mức hao mòn thực tế.</Text>
              <Text style={s.text}>Lần gần nhất: {dateLabel(t.lastRecord?.date)}</Text>
              <Text style={s.text}>
                Mốc tiếp: {t.nextKm != null ? km(t.nextKm) : 'Chưa xác định'} ·{' '}
                {dateLabel(t.nextDate)}
              </Text>
              <Text style={s.muted}>
                {t.item.estimated_cost_max
                  ? `Giá tham khảo: ${money(t.item.estimated_cost_min)} – ${money(t.item.estimated_cost_max)}`
                  : 'Chưa có báo giá'}
              </Text>
              {data.parts
                .filter((p) => p.maintenance_item_id === t.item.id)
                .map((p) => (
                  <View key={p.id}>
                    <Text style={s.text}>{p.part_name}</Text>
                    <Text style={s.small}>
                      {p.notes} · {money(p.estimated_price_min)} – {money(p.estimated_price_max)}
                    </Text>
                  </View>
                ))}
              {t.item.source_url?.startsWith('https://') && (
                <Button
                  title="Nguồn chu kỳ ↗"
                  secondary
                  onPress={() => void Linking.openURL(t.item.source_url!).catch(notifyError)}
                />
              )}
              <Text style={s.text}>Dự báo từ lịch sử</Text>
              <Text style={s.small}>
                {t.predictedDate
                  ? `Khoảng ${dateLabel(t.predictedDate)} đạt mốc km nếu giữ mức ${t.riding?.kmPerDay} km/ngày, từ lần ghi nhận ${dateLabel(t.riding?.lastDate)}. Không thay thế hạn bảo dưỡng.`
                  : t.riding?.reason || 'Cần bổ sung lịch sử để học mức sử dụng.'}
              </Text>
            </>
          )}
          <Button
            title={t.urgency === 'unknown' ? 'Bổ sung lịch sử' : 'Ghi nhận đã thực hiện'}
            onPress={() =>
              router.push({
                pathname: '/record',
                params: { vehicle: t.vehicle.id, item: t.item.id },
              })
            }
          />
          <Button title="Tìm cửa hàng" secondary onPress={() => router.push('/stores')} />
        </Card>
      ))}
      {tips.length > limit && (
        <Button secondary title="Xem thêm hạng mục" onPress={() => setLimit((n) => n + 12)} />
      )}
      {!tips.length && (
        <Card>
          <Text style={s.muted}>Chưa có hạng mục phù hợp. Thử đổi bộ lọc hoặc thêm xe.</Text>
        </Card>
      )}
    </Screen>
  )
}

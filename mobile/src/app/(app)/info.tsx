import { useState } from 'react'
import { Text, View } from 'react-native'
import * as Linking from 'expo-linking'
import { useData } from '../../lib/AppProvider'
import { Button, Card, Input, Screen, notifyError, s } from '../../components/UI'
import { money } from '../../../../shared/maintenance'
import { intervalLabel, manualSources } from '../../../../shared/knowledge'
import { vehicleGroups, matchesModel } from '../../../../shared/catalog'
export default function Info() {
  const { data } = useData()
  const [model, setModel] = useState(data.vehicles[0]?.id || '')
  const [type, setType] = useState(data.vehicles[0]?.type || 'scooter')
  const [search, setSearch] = useState('')
  return (
    <Screen
      title="Thông tin bảo dưỡng"
      subtitle="Tra cứu theo mẫu xe, đối chiếu đúng đời xe trước khi áp dụng."
    >
      <View style={{ gap: 8 }}>
        {vehicleGroups.map((group) => (
          <Button
            key={group.type}
            title={group.label}
            secondary={type !== group.type}
            onPress={() => {
              setType(group.type)
              setModel(data.vehicles.find((v) => v.type === group.type)?.id || '')
              setSearch('')
            }}
          />
        ))}
      </View>
      <Input
        label="Tìm mẫu xe"
        value={search}
        onChangeText={setSearch}
        placeholder="AB, SH, Wave…"
      />
      <View style={{ gap: 8 }}>
        {data.vehicles
          .filter((v) => v.type === type && matchesModel(`${v.name} ${v.model}`, search))
          .map((v) => (
            <Button
              key={v.id}
              title={`${v.name} · ${v.model}`}
              secondary={model !== v.id}
              onPress={() => setModel(v.id)}
            />
          ))}
      </View>
      {data.items
        .filter((i) => i.vehicle_id === model)
        .map((i) => (
          <Card key={i.id}>
            <Text style={s.heading}>{i.name}</Text>
            <Text style={s.text}>{intervalLabel(i)}</Text>
            <Text style={s.muted}>{i.description}</Text>
            <Text style={s.muted}>
              {i.estimated_cost_max
                ? `${money(i.estimated_cost_min)} – ${money(i.estimated_cost_max)}`
                : 'Chưa có báo giá'}
            </Text>
            <Text style={s.small}>
              {i.verified
                ? 'Đã đối chiếu bởi quản trị viên.'
                : 'Chu kỳ tham khảo, chưa xác minh cho đúng đời xe.'}
            </Text>
            {i.source_url?.startsWith('https://') && (
              <Button
                title="Xem nguồn ↗"
                secondary
                onPress={() => void Linking.openURL(i.source_url!).catch(notifyError)}
              />
            )}
          </Card>
        ))}
      {!data.items.some((i) => i.vehicle_id === model) && (
        <Text style={s.muted}>Mẫu xe này chưa có hạng mục.</Text>
      )}
      <Button
        title="Tra sách hướng dẫn Honda ↗"
        secondary
        onPress={() =>
          void Linking.openURL(
            'https://www.honda.com.vn/xe-may/dich-vu-sau-ban-hang/huong-dan-su-dung',
          ).catch(notifyError)
        }
      />
      <Text style={s.heading}>Tài liệu đã đối chiếu</Text>
      {manualSources.map((source) => (
        <Card key={source.id}>
          <Text style={s.heading}>{source.title}</Text>
          <Text style={s.small}>
            {source.scope} · trang {source.pages}
          </Text>
          <Button
            secondary
            title="Đọc tài liệu Honda"
            onPress={() => void Linking.openURL(source.url).catch(notifyError)}
          />
        </Card>
      ))}
    </Screen>
  )
}

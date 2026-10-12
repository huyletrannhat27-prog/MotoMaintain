import { useState } from 'react'
import { Text } from 'react-native'
import * as Linking from 'expo-linking'
import { useData } from '../../lib/AppProvider'
import { Button, Card, Input, Screen, notifyError, s } from '../../components/UI'
export default function Stores() {
  const { data } = useData()
  const [search, setSearch] = useState('')
  const stores = data.stores.filter(
    (s) =>
      s.is_active !== false &&
      [s.name, s.address, s.city]
        .join(' ')
        .toLocaleLowerCase('vi')
        .includes(search.toLocaleLowerCase('vi')),
  )
  return (
    <Screen title="Cửa hàng dịch vụ" subtitle="Tìm theo tên hoặc khu vực và mở chỉ đường.">
      <Input label="Tên, địa chỉ hoặc thành phố" value={search} onChangeText={setSearch} />
      {stores.map((store) => (
        <Card key={store.id}>
          <Text style={s.heading}>{store.name}</Text>
          <Text style={s.muted}>
            {store.address}, {store.city}
          </Text>
          <Text style={s.small}>{store.opening_hours || 'Liên hệ để biết giờ mở cửa'}</Text>
          <Button
            title="Mở bản đồ & chỉ đường ↗"
            onPress={() =>
              void Linking.openURL(
                `https://www.google.com/maps/dir/?api=1&destination=${store.lat},${store.lng}`,
              ).catch(notifyError)
            }
          />
          {store.phone && (
            <Button
              title={`Gọi ${store.phone}`}
              secondary
              onPress={() =>
                void Linking.openURL(`tel:${store.phone!.replace(/[^+0-9]/g, '')}`).catch(
                  notifyError,
                )
              }
            />
          )}
        </Card>
      ))}
      {!stores.length && (
        <Card>
          <Text style={s.heading}>Chưa có cửa hàng phù hợp</Text>
          <Text style={s.muted}>
            Thử đổi từ khóa. Quản trị viên có thể bổ sung địa chỉ đã xác minh trên web.
          </Text>
          <Button
            title="Tra cửa hàng Honda ↗"
            secondary
            onPress={() =>
              void Linking.openURL('https://www.honda.com.vn/xe-may/danh-sach-cua-hang').catch(
                notifyError,
              )
            }
          />
        </Card>
      )}
    </Screen>
  )
}

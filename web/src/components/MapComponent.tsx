'use client'
import { useEffect, useRef } from 'react'
import L from 'leaflet'
import type { HondaStore } from '@/lib/types'
export default function MapComponent({
  stores,
  userLocation,
  selectedStore,
  onSelectStore,
}: {
  stores: (HondaStore & { distance?: number })[]
  userLocation: { lat: number; lng: number } | null
  selectedStore: HondaStore | null
  onSelectStore: (store: HondaStore) => void
}) {
  const container = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!container.current) return
    const center = selectedStore || userLocation || stores[0] || { lat: 10.762622, lng: 106.660172 }
    const map = L.map(container.current).setView([center.lat, center.lng], selectedStore ? 15 : 12)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)
    stores.forEach((store) => {
      const popup = document.createElement('div')
      const title = document.createElement('strong')
      title.textContent = store.name
      const address = document.createElement('p')
      address.textContent = store.address
      popup.append(title, address)
      const marker = L.circleMarker([store.lat, store.lng], {
        radius: selectedStore?.id === store.id ? 12 : 8,
        color: '#fff',
        weight: 2,
        fillColor: '#e7614c',
        fillOpacity: 1,
      })
        .addTo(map)
        .bindPopup(popup)
      marker.on('click', () => onSelectStore(store))
      if (selectedStore?.id === store.id) marker.openPopup()
    })
    if (userLocation)
      L.circleMarker([userLocation.lat, userLocation.lng], {
        radius: 7,
        color: '#fff',
        fillColor: '#4589ef',
        fillOpacity: 1,
      })
        .addTo(map)
        .bindPopup('Vị trí của bạn')
    return () => {
      map.remove()
    }
  }, [stores, userLocation, selectedStore, onSelectStore])
  return (
    <div ref={container} style={{ width: '100%', height: '100%' }} aria-label="Bản đồ cửa hàng" />
  )
}

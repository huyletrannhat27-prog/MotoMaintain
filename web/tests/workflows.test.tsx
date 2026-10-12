import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AnchorHTMLAttributes } from 'react'
import { DataProvider } from '../src/components/DataProvider'
import VehiclesPage from '../src/app/(app)/vehicles/page'
import InputPage from '../src/app/(app)/input/page'
import TipsPage from '../src/app/(app)/tips/page'
import HistoryPage from '../src/app/(app)/history/page'
import DashboardPage from '../src/app/(app)/dashboard/page'
import SchedulePage from '../src/app/(app)/schedule/page'
import InfoPage from '../src/app/(app)/info/page'
import { createDemoData } from '../../shared/demo'
import type { AppData } from '../../shared/types'
const navigation = vi.hoisted(() => ({
  query: '',
  router: { replace: vi.fn(), push: vi.fn(), refresh: vi.fn() },
}))
vi.mock('next/navigation', () => ({
  useRouter: () => navigation.router,
  useSearchParams: () => new URLSearchParams(navigation.query),
}))
vi.mock('next/link', () => ({
  default: ({ children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...props}>{children}</a>
  ),
}))
vi.mock('../src/lib/config', () => ({ isConfigured: false }))
const KEY = 'motomaintain-demo-v1'
const stored = () => JSON.parse(localStorage.getItem(KEY)!) as AppData
beforeEach(() => {
  localStorage.clear()
  navigation.query = ''
  vi.clearAllMocks()
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})
test('model search recognises AB, separates scooter and geared vehicles, and offers scoped Honda models', async () => {
  const user = userEvent.setup()
  render(
    <DataProvider>
      <VehiclesPage />
    </DataProvider>,
  )
  await user.click(await screen.findByRole('button', { name: 'Thêm xe' }))
  await user.type(screen.getByLabelText('Tìm mẫu xe'), 'AB')
  expect(screen.getByRole('option', { name: /ACA125CBF/ })).toBeTruthy()
  expect(screen.queryByRole('option', { name: /Wave/ })).toBeNull()
  await user.click(screen.getByRole('button', { name: /Xe số.*Wave/ }))
  expect(screen.getByRole('option', { name: /4FK89A30/ })).toBeTruthy()
  expect(screen.queryByRole('option', { name: /SH125/ })).toBeNull()
})
test('notes require explicit confirmation and negation never auto-selects work', async () => {
  navigation.query = 'vehicle=my-vision'
  const user = userEvent.setup()
  render(
    <DataProvider>
      <InputPage />
    </DataProvider>,
  )
  const note = await screen.findByLabelText('Ghi chú')
  await user.type(note, 'chưa thay nhớt')
  expect(screen.queryByRole('button', { name: 'Đúng, chọn các hạng mục này' })).toBeNull()
  expect(
    (screen.getByRole('checkbox', { name: 'Thay dầu động cơ' }) as HTMLInputElement).checked,
  ).toBe(false)
  await user.clear(note)
  await user.type(note, 'đã thay nhớt máy')
  expect(
    (screen.getByRole('checkbox', { name: 'Thay dầu động cơ' }) as HTMLInputElement).checked,
  ).toBe(false)
  await user.click(screen.getByRole('button', { name: 'Đúng, chọn các hạng mục này' }))
  expect(
    (screen.getByRole('checkbox', { name: 'Thay dầu động cơ' }) as HTMLInputElement).checked,
  ).toBe(true)
  await user.click(screen.getByRole('button', { name: 'Lưu bảo dưỡng' }))
  await screen.findByRole('heading', { name: 'Xe đã được cập nhật.' })
  expect(
    stored().records.some((r) => r.notes === 'đã thay nhớt máy' && r.items_maintained.length === 1),
  ).toBe(true)
})
test('add vehicle, save selected service, view per-item tips and persist after remount', async () => {
  const user = userEvent.setup()
  const view = render(
    <DataProvider>
      <VehiclesPage />
    </DataProvider>,
  )
  await user.click(await screen.findByRole('button', { name: 'Thêm xe' }))
  await user.selectOptions(screen.getByLabelText('Mẫu xe *'), 'vision')
  await user.type(screen.getByLabelText('Tên gọi của xe'), 'Xe kiểm thử')
  fireEvent.change(screen.getByLabelText('Số km hiện tại *'), { target: { value: '1000' } })
  await user.click(screen.getByRole('button', { name: 'Lưu xe' }))
  await screen.findByRole('heading', { name: 'Xe kiểm thử' })
  const vehicle = stored().userVehicles.find((v) => v.nickname === 'Xe kiểm thử')!
  expect(vehicle.current_km).toBe(1000)
  navigation.query = `vehicle=${vehicle.id}`
  view.rerender(
    <DataProvider>
      <InputPage />
    </DataProvider>,
  )
  await user.click(await screen.findByRole('checkbox', { name: /Thay dầu động cơ/ }))
  fireEvent.change(screen.getByLabelText('Tổng chi phí (đ)'), { target: { value: '0' } })
  await user.click(screen.getByRole('button', { name: 'Lưu bảo dưỡng' }))
  await screen.findByRole('heading', { name: 'Xe đã được cập nhật.' })
  const record = stored().records.find((r) => r.user_vehicle_id === vehicle.id)!
  expect(record.items_maintained).toEqual(['vision-0'])
  expect(record.cost).toBe(0)
  view.unmount()
  render(
    <DataProvider>
      <TipsPage />
    </DataProvider>,
  )
  await screen.findByRole('heading', { name: 'Thay dầu động cơ' })
  expect(screen.getAllByText('3.000 km').length).toBeGreaterThan(0)
  expect(screen.getAllByText(/Bổ sung lần thực hiện gần nhất/)).toHaveLength(3)
})
test('editing service preserves id; invalid km reports error without changing history', async () => {
  const d = createDemoData()
  localStorage.setItem(KEY, JSON.stringify(d))
  navigation.query = 'edit=r2'
  const user = userEvent.setup()
  render(
    <DataProvider>
      <InputPage />
    </DataProvider>,
  )
  const odo = await screen.findByLabelText('Số km khi bảo dưỡng *')
  fireEvent.change(odo, { target: { value: '9000' } })
  await user.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))
  expect((await screen.findByRole('alert')).textContent).toContain('không khớp')
  expect(stored().records.find((r) => r.id === 'r2')?.km_at_maintenance).toBe(12000)
  fireEvent.change(odo, { target: { value: '12500' } })
  await user.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))
  await screen.findByRole('heading', { name: 'Xe đã được cập nhật.' })
  expect(stored().records).toHaveLength(3)
  expect(stored().records.find((r) => r.id === 'r2')?.km_at_maintenance).toBe(12500)
  expect(stored().userVehicles.find((v) => v.id === 'my-vision')?.current_km).toBe(12600)
})
test('deletion is cancelled without losing data, then recalculates when confirmed', async () => {
  const user = userEvent.setup()
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
  render(
    <DataProvider>
      <HistoryPage />
    </DataProvider>,
  )
  const buttons = await screen.findAllByRole('button', { name: 'Xóa' })
  await user.click(buttons[0])
  expect(stored().records).toHaveLength(3)
  confirm.mockReturnValue(true)
  await user.click(buttons[0])
  await waitFor(() => expect(stored().records).toHaveLength(2))
  expect(stored().userVehicles.find((v) => v.id === 'my-vision')?.current_km).toBe(12600)
})
test('dashboard totals include more than ten records and vehicle filters change them', async () => {
  const data = createDemoData()
  data.records = Array.from({ length: 12 }, (_, i) => ({
    ...data.records[0],
    id: `test-${i}`,
    cost: 10000,
  }))
  localStorage.setItem(KEY, JSON.stringify(data))
  render(
    <DataProvider>
      <DashboardPage />
    </DataProvider>,
  )
  await screen.findAllByText('120.000 đ')
  expect(screen.getByText('12')).toBeTruthy()
  await userEvent.setup().selectOptions(screen.getByLabelText('Xe của bạn'), 'my-wave')
  await screen.findByText('0 đ')
})
test('calendar and catalog render empty account without crashing', async () => {
  const data = createDemoData()
  data.userVehicles = []
  data.records = []
  localStorage.setItem(KEY, JSON.stringify(data))
  const view = render(
    <DataProvider>
      <SchedulePage />
    </DataProvider>,
  )
  await screen.findByText('Chưa có hạng mục cần nhắc. Bổ sung lịch sử để tính mốc còn thiếu.')
  view.rerender(
    <DataProvider>
      <InfoPage />
    </DataProvider>,
  )
  await screen.findByRole('heading', { name: 'Thay dầu động cơ' })
})
test('a failed persistence write leaves the form open and existing vehicle data intact', async () => {
  const user = userEvent.setup()
  render(
    <DataProvider>
      <VehiclesPage />
    </DataProvider>,
  )
  await user.click(await screen.findByRole('button', { name: 'Thêm xe' }))
  await user.click(screen.getByRole('button', { name: /Xe số.*Wave/ }))
  await user.selectOptions(screen.getByLabelText('Mẫu xe *'), 'wave')
  const before = localStorage.getItem(KEY)
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('Dung lượng lưu trữ đã đầy.')
  })
  await user.click(screen.getByRole('button', { name: 'Lưu xe' }))
  expect((await screen.findByRole('alert')).textContent).toContain('Dung lượng lưu trữ')
  expect(localStorage.getItem(KEY)).toBe(before)
  expect(screen.getByRole('button', { name: 'Lưu xe' })).toBeTruthy()
})

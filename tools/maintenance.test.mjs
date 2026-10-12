import { test } from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
registerHooks({
  resolve(specifier, context, next) {
    if (
      context.parentURL?.includes('/shared/') &&
      specifier.startsWith('./') &&
      !specifier.endsWith('.ts')
    )
      specifier += '.ts'
    return next(specifier, context)
  },
})
const { recommendations, addCalendarMonths, validDate, validateRecord, validateVehicle, todayISO } =
  await import('../shared/maintenance.ts')
const { saveDemoRecord, saveDemoVehicle } = await import('../shared/mutations.ts')
const { createDemoData } = await import('../shared/demo.ts')
function fixture() {
  const d = createDemoData()
  d.userVehicles = d.userVehicles.slice(0, 1)
  d.userVehicles[0].current_km = 13000
  d.records = [
    {
      id: 'oil',
      user_vehicle_id: 'my-vision',
      user_id: 'demo',
      date: '2026-01-31',
      km_at_maintenance: 10000,
      items_maintained: ['vision-0'],
      created_at: '2026-01-31',
    },
    {
      id: 'brake',
      user_vehicle_id: 'my-vision',
      user_id: 'demo',
      date: '2026-06-01',
      km_at_maintenance: 12000,
      items_maintained: ['vision-1'],
      created_at: '2026-06-01',
    },
  ]
  return d
}
test('each item uses its own most recent service, current odometer drives urgency', () => {
  const result = recommendations(fixture(), '2026-06-15')
  const oil = result.find((r) => r.item.id === 'vision-0')
  const brake = result.find((r) => r.item.id === 'vision-1')
  assert.equal(oil.nextKm, 12000)
  assert.equal(oil.urgency, 'overdue')
  assert.equal(brake.nextKm, 16000)
  assert.equal(brake.lastRecord.id, 'brake')
  assert.equal(brake.urgency, 'ok')
})
test('missing history remains unknown even when a purchase date exists', () => {
  const r = recommendations(fixture(), '2026-06-15').find((r) => r.item.id === 'vision-2')
  assert.equal(r.urgency, 'unknown')
  assert.equal(r.nextDate, undefined)
})
test('calendar months clamp end-of-month and account for leap years', () => {
  assert.equal(addCalendarMonths('2024-01-31', 1), '2024-02-29')
  assert.equal(addCalendarMonths('2025-01-31', 1), '2025-02-28')
  assert.equal(addCalendarMonths('2026-12-31', 2), '2027-02-28')
  assert.equal(validDate('2026-02-30'), false)
})
test('Vietnam dates are consistent across host timezones', () => {
  assert.equal(todayISO(new Date('2026-10-08T18:00:00Z')), '2026-10-09')
})
test('time can become due before distance; due today is not overdue', () => {
  const d = fixture()
  d.userVehicles[0].current_km = 12000
  const oil = recommendations(d, '2026-07-31').find((r) => r.item.id === 'vision-0')
  assert.equal(oil.daysRemaining, 0)
  assert.equal(oil.urgency, 'urgent')
  assert.equal(
    recommendations(d, '2026-08-01').find((r) => r.item.id === 'vision-0').urgency,
    'overdue',
  )
})
test('zero intervals and inconsistent odometers do not yield misleading progress', () => {
  const d = fixture()
  d.items[0].interval_km = 0
  d.items[0].interval_months = 0
  assert.equal(
    recommendations(d, '2026-06-15').find((r) => r.item.id === 'vision-0').urgency,
    'unknown',
  )
  d.items[0].interval_km = 2000
  d.items[0].interval_months = 6
  d.userVehicles[0].current_km = 9000
  assert.equal(
    recommendations(d, '2026-06-15').find((r) => r.item.id === 'vision-0').urgency,
    'unknown',
  )
})
test('backdated entry preserves current odometer and accepts zero cost', () => {
  const d = fixture()
  const next = saveDemoRecord(
    d,
    {
      user_vehicle_id: 'my-vision',
      date: '2026-03-01',
      km_at_maintenance: 11000,
      items_maintained: ['vision-2'],
      cost: 0,
    },
    'backdated',
  )
  assert.equal(next.userVehicles[0].current_km, 13000)
  assert.equal(next.records.find((r) => r.id === 'backdated').cost, 0)
  assert.equal(d.records.length, 2)
})
test('validation rejects chronology conflicts, wrong model items, future dates and negative costs', () => {
  const d = fixture()
  const input = {
    user_vehicle_id: 'my-vision',
    date: '2026-03-01',
    km_at_maintenance: 11000,
    items_maintained: ['vision-0'],
  }
  assert.throws(() => validateRecord({ ...input, km_at_maintenance: 9000 }, d))
  assert.throws(() => validateRecord({ ...input, km_at_maintenance: 14000 }, d))
  assert.throws(() => validateRecord({ ...input, items_maintained: ['wave-0'] }, d))
  assert.throws(() => validateRecord({ ...input, date: '2099-01-01' }, d))
  assert.throws(() => validateRecord({ ...input, cost: -1 }, d))
  assert.throws(() => validateRecord({ ...input, items_maintained: [] }, d))
})
test('editing and deleting service recomputes due item without resetting other items', () => {
  const d = fixture()
  const next = saveDemoRecord(
    d,
    { ...d.records[0], date: '2026-02-01', km_at_maintenance: 10500 },
    'oil',
  )
  assert.equal(
    recommendations(next, '2026-06-15').find((t) => t.item.id === 'vision-0').nextKm,
    12500,
  )
  next.records = next.records.filter((r) => r.id !== 'oil')
  assert.equal(
    recommendations(next, '2026-06-15').find((t) => t.item.id === 'vision-0').urgency,
    'unknown',
  )
  assert.equal(
    recommendations(next, '2026-06-15').find((t) => t.item.id === 'vision-1').nextKm,
    16000,
  )
})
test('vehicle cannot fall below recorded odometer or switch model with existing history', () => {
  const d = fixture()
  assert.throws(() =>
    validateVehicle({ ...d.userVehicles[0], current_km: 9000 }, d.records, 'my-vision'),
  )
  assert.throws(() => saveDemoVehicle(d, { ...d.userVehicles[0], vehicle_id: 'wave' }, 'my-vision'))
  assert.throws(() => saveDemoVehicle(d, { ...d.userVehicles[0], current_km: NaN }, 'my-vision'))
})

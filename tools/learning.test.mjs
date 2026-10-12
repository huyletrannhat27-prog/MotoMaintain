import './register-shared.mjs'
import { test } from 'node:test'
import assert from 'node:assert/strict'
const { learnRidingRate, emptyNoteModel, trainNote, classifyNote, suggestNote, learnNoteModel } =
  await import('../shared/learning.ts')
const { officialCatalog, upgradeDemoCatalog } = await import('../shared/knowledge.ts')
const { createDemoData } = await import('../shared/demo.ts')
const { recommendations, validateVehicle } = await import('../shared/maintenance.ts')
const { matchesModel, groupOwnedVehicles } = await import('../shared/catalog.ts')
const observation = (date, km, id = 'v') => ({
  id: date,
  user_vehicle_id: id,
  date,
  km_at_maintenance: km,
  items_maintained: ['x'],
  created_at: date,
})
test('search accepts AB alias, accents and keeps motorcycle groups separate', () => {
  assert.ok(matchesModel('Honda Air Blade 125', 'AB 125'))
  assert.ok(matchesModel('Honda Wave Alpha', 'wave'))
  const groups = groupOwnedVehicles(createDemoData())
  assert.equal(groups[0].vehicles[0].id, 'my-vision')
  assert.equal(groups[1].vehicles[0].id, 'my-wave')
})
test('official facts are model-scoped, traceable and upgrade preserves personal history', () => {
  const c = officialCatalog()
  assert.equal(c.vehicles.length, 5)
  assert.equal(c.items.length, 32)
  assert.ok(
    c.items.every(
      (i) =>
        i.verified &&
        i.source_url.startsWith('https://') &&
        c.vehicles.some((v) => v.id === i.vehicle_id),
    ),
  )
  const d = createDemoData(),
    upgraded = upgradeDemoCatalog(d)
  assert.equal(upgraded.vehicles.length, d.vehicles.length)
  assert.equal(upgraded.records, d.records)
  assert.equal(upgraded.items.find((i) => i.id === 'vision-0').verified, false)
  assert.ok(!c.items.some((i) => i.vehicle_id === 'wave-2025' && i.name.includes('làm mát')))
})
test('official schedule retains 1000 km break-in then 6000 km absolute milestone', () => {
  const c = officialCatalog()
  const v = { id: 'v', vehicle_id: 'ab125-2025', current_km: 1100 }
  const record = { ...observation('2026-09-01', 1000), items_maintained: ['ab125-2025-oil'] }
  const d = { ...c, userVehicles: [v], records: [record] }
  assert.equal(
    recommendations(d, '2026-10-01').find((t) => t.item.id === 'ab125-2025-oil').nextKm,
    6000,
  )
  record.km_at_maintenance = 500
  assert.equal(
    recommendations(d, '2026-10-01').find((t) => t.item.id === 'ab125-2025-oil').nextKm,
    1000,
  )
  record.km_at_maintenance = 6500
  v.current_km = 6500
  assert.equal(
    recommendations(d, '2026-10-01').find((t) => t.item.id === 'ab125-2025-oil').nextKm,
    12000,
  )
})
test('time-only and km-only maintenance do not invent the absent threshold', () => {
  const c = officialCatalog(),
    id = 'sh125-2025'
  const d = {
    ...c,
    userVehicles: [{ id: 'v', vehicle_id: id, current_km: 20000 }],
    records: [
      { ...observation('2025-01-31', 18000), items_maintained: [`${id}-gear-oil`, `${id}-filter`] },
    ],
  }
  const r = recommendations(d, '2026-10-01')
  const oil = r.find((t) => t.item.id === `${id}-gear-oil`),
    filter = r.find((t) => t.item.id === `${id}-filter`)
  assert.equal(oil.nextKm, undefined)
  assert.equal(oil.nextDate, '2027-01-31')
  assert.equal(filter.nextDate, undefined)
  assert.equal(filter.nextKm, 36000)
  assert.ok(Number.isFinite(oil.progress) && Number.isFinite(filter.progress))
})
test('personal pace learns dated observations and abstains on sparse/stale/contradictory history', () => {
  const records = [
    observation('2026-07-01', 0),
    observation('2026-08-01', 310),
    observation('2026-09-01', 620),
  ]
  const v = { id: 'v', current_km: 999999 }
  assert.equal(learnRidingRate(v, records, '2026-09-15').kmPerDay, 10)
  assert.equal(learnRidingRate(v, records.slice(0, 2), '2026-09-15').kmPerDay, undefined)
  assert.equal(learnRidingRate(v, records, '2027-01-01').kmPerDay, undefined)
  assert.equal(
    learnRidingRate(v, [...records, observation('2026-09-10', 50)], '2026-09-15').kmPerDay,
    undefined,
  )
  assert.equal(learnRidingRate({ id: 'another' }, records, '2026-09-15').kmPerDay, undefined)
})
test('Theil–Sen rate tolerates one monotonic jump and uses bounded observations', () => {
  const records = Array.from({ length: 120 }, (_, i) =>
    observation(
      new Date(Date.UTC(2026, 0, i + 1)).toISOString().slice(0, 10),
      i * 10 + (i === 119 ? 9000 : 0),
    ),
  )
  const rate = learnRidingRate({ id: 'v' }, records, '2026-05-01')
  assert.equal(rate.samples, 60)
  assert.equal(rate.kmPerDay, 10)
})
test('notes abstain on negation and wrong fluid; suggestions never imply a saved record', () => {
  const items = createDemoData().items.filter((i) => i.vehicle_id === 'vision'),
    m = emptyNoteModel()
  assert.deepEqual(suggestNote('đã thay nhớt máy, kiểm tra phanh', items, m).ids, [
    'vision-0',
    'vision-1',
  ])
  for (const note of [
    'chưa thay nhớt',
    'không thay nhớt',
    'sẽ thay nhớt',
    'thay nhớt láp',
    'nội dung lạ hoàn toàn',
  ])
    assert.deepEqual(suggestNote(note, items, m).ids, [])
})
test('Naive Bayes learns confirmed labels, rejects unknown vocabulary and handles prototype words', () => {
  const m = emptyNoteModel()
  for (let i = 0; i < 6; i++) {
    trainNote(m, 'dầu máy động cơ bôi trơn constructor', 'oil')
    trainNote(m, 'má phanh thắng bánh xe prototype', 'brake')
  }
  assert.equal(classifyNote(m, 'dầu máy bôi trơn').label, 'oil')
  assert.equal(classifyNote(m, 'phanh thắng').label, 'brake')
  assert.equal(classifyNote(m, 'unseen completely'), undefined)
  assert.ok(Number.isFinite(classifyNote(m, 'constructor dầu máy').score))
  assert.equal(classifyNote(JSON.parse(JSON.stringify(m)), 'constructor dầu máy').label, 'oil')
})
test('edited and multi-item notes are excluded from personal label training', () => {
  const items = createDemoData().items
  const records = [
    { ...observation('2026-01-01', 1000), notes: 'nhớt', items_maintained: ['vision-0'] },
    {
      ...observation('2026-02-01', 1200),
      notes: 'nhớt phanh',
      items_maintained: ['vision-0', 'vision-1'],
    },
  ]
  assert.equal(learnNoteModel(records, items, '2026-01-01').samples, 0)
})
test('100,000 record history computes all items without argument-limit errors', () => {
  const d = createDemoData()
  d.records = Array.from({ length: 100000 }, (_, i) => ({
    ...d.records[0],
    id: String(i),
    km_at_maintenance: i,
    date: '2026-01-01',
  }))
  d.userVehicles[0].current_km = 100000
  const start = performance.now(),
    results = recommendations(d, '2026-10-01')
  assert.equal(results.find((t) => t.item.id === 'vision-0').lastRecord.km_at_maintenance, 99999)
  assert.doesNotThrow(() =>
    validateVehicle({ vehicle_id: 'vision', current_km: 100000 }, d.records, 'my-vision'),
  )
  console.log(
    `100000-record recommendation benchmark: ${Math.round(performance.now() - start)} ms (synthetic; not a production SLA)`,
  )
})

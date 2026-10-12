import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { execFileSync } from 'node:child_process'
const cli = new URL('./prepare-data.mjs', import.meta.url)
const base = {
  vehicle_key: 'anonymous-bike-1',
  model_id: 'vision',
  date: '2026-01-01',
  km: 1000,
  item_ids: ['vision-0'],
  notes: 'đã thay nhớt',
  confirmed: true,
}
test('streaming import quarantines malformed, oversized, unknown and conflicting history and deduplicates', async () => {
  const dir = await mkdtemp(resolve(tmpdir(), 'motomaintain-import-'))
  const input = resolve(dir, 'input.jsonl'),
    output = resolve(dir, 'job')
  const rows = [
    base,
    base,
    { ...base, vehicle_key: 'bad-bike', date: '2026-01-02', km: 2000 },
    { ...base, vehicle_key: 'bad-bike', date: '2026-02-01', km: 1000 },
    { ...base, model_id: 'unknown' },
    { ...base, confirmed: false },
  ]
  await writeFile(
    input,
    rows.map((r) => JSON.stringify(r)).join('\n') + '\n{invalid}\n' + 'x'.repeat(70000) + '\n',
  )
  execFileSync(
    process.execPath,
    [cli.pathname.replace(/^\/([A-Z]:)/, '$1'), input, output, '2026-02-01'],
    { encoding: 'utf8', stdio: 'pipe' },
  )
  const report = JSON.parse(await readFile(resolve(output, 'report.json'), 'utf8'))
  assert.equal(report.read, 8)
  assert.equal(report.accepted, 1)
  assert.equal(report.duplicates, 1)
  assert.equal(report.review, 6)
  assert.equal(report.accuracyOnAnswered, null)
  assert.equal(report.sha256.length, 64)
  const accepted = JSON.parse((await readFile(resolve(output, 'accepted.jsonl'), 'utf8')).trim())
  assert.equal(accepted.vehicle_key, base.vehicle_key)
  assert.throws(() =>
    execFileSync(process.execPath, [cli.pathname.replace(/^\/([A-Z]:)/, '$1'), input, output], {
      stdio: 'pipe',
    }),
  )
})
test('temporal evaluation excludes repeated training text and reports actual abstention', async () => {
  const dir = await mkdtemp(resolve(tmpdir(), 'motomaintain-split-'))
  const input = resolve(dir, 'input.jsonl'),
    output = resolve(dir, 'job')
  const rows = Array.from({ length: 12 }, (_, i) => ({
    ...base,
    date: `2026-01-${String(i + 1).padStart(2, '0')}`,
    km: 1000 + i * 10,
    item_ids: [i % 2 ? 'vision-1' : 'vision-0'],
    notes: i % 2 ? 'thắng phanh kiểm tra' : 'dầu nhớt máy động cơ',
  }))
  rows.push(
    { ...base, date: '2026-02-01', km: 2000, notes: 'dầu nhớt máy động cơ' },
    { ...base, date: '2026-02-02', km: 2010, notes: 'gibberish unseen' },
  )
  await writeFile(input, rows.map((r) => JSON.stringify(r)).join('\n'))
  execFileSync(
    process.execPath,
    [cli.pathname.replace(/^\/([A-Z]:)/, '$1'), input, output, '2026-02-01'],
    { stdio: 'pipe' },
  )
  const report = JSON.parse(await readFile(resolve(output, 'report.json'), 'utf8'))
  assert.equal(report.train, 12)
  assert.equal(report.overlapExcluded, 1)
  assert.equal(report.test, 1)
  assert.equal(report.coverage, 0)
})

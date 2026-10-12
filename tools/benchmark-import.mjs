// Synthetic throughput check only. This dataset must not be used to claim model quality.
import { createWriteStream } from 'node:fs'
import { mkdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { once } from 'node:events'
import { spawn } from 'node:child_process'
const root = new URL(`./artifacts/benchmark-${Date.now()}/`, import.meta.url)
await mkdir(root, { recursive: true })
const file = new URL('synthetic.jsonl', root),
  stream = createWriteStream(file)
for (let i = 0; i < 100000; i++) {
  const row = {
    vehicle_key: `synthetic-${i % 1000}`,
    model_id: 'vision',
    date: new Date(Date.UTC(2026, 0, 1 + Math.floor(i / 1000))).toISOString().slice(0, 10),
    km: Math.floor(i / 1000) * 20,
    item_ids: [i % 2 ? 'vision-0' : 'vision-1'],
    notes: i % 2 ? 'Thay dầu động cơ mẫu giả lập' : 'Kiểm tra phanh mẫu giả lập',
    confirmed: true,
  }
  if (!stream.write(JSON.stringify(row) + '\n')) await once(stream, 'drain')
}
stream.end()
await once(stream, 'finish')
const start = performance.now()
const child = spawn(
  process.execPath,
  [
    fileURLToPath(new URL('prepare-data.mjs', import.meta.url)),
    fileURLToPath(file),
    fileURLToPath(new URL('job', root)),
    '2026-03-01',
  ],
  { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true },
)
let error = ''
child.stderr.on('data', (c) => (error += c))
const [code] = await once(child, 'exit')
if (code !== 0) throw Error(error)
const report = JSON.parse(await readFile(new URL('job/report.json', root), 'utf8'))
console.log(
  JSON.stringify(
    {
      synthetic: true,
      records: report.read,
      accepted: report.accepted,
      seconds: Number(((performance.now() - start) / 1000).toFixed(2)),
      resultDirectory: fileURLToPath(root),
      accuracyClaim: 'none; repeated synthetic text is excluded from evaluation',
    },
    null,
    2,
  ),
)

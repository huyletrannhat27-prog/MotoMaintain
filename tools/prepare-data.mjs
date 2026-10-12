/** Offline JSONL review/training job. Never writes to a live account or uploads data. */
import './register-shared.mjs'
import { createReadStream, createWriteStream } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve, basename } from 'node:path'
import { createHash } from 'node:crypto'
import { once } from 'node:events'
import { DatabaseSync } from 'node:sqlite'
const { createDemoData } = await import('../shared/demo.ts')
const { emptyNoteModel, trainNote, classifyNote } = await import('../shared/learning.ts')
const { normalizeText } = await import('../shared/catalog.ts')
const { validDate, todayISO } = await import('../shared/maintenance.ts')

const [inputArg, outArg, cutoff] = process.argv.slice(2)
if (!inputArg || !outArg || (cutoff && !validDate(cutoff))) {
  console.error(
    'Usage: node tools/prepare-data.mjs input.jsonl NEW_OUTPUT_DIR [YYYY-MM-DD validation cutoff]',
  )
  process.exit(1)
}
const input = resolve(inputArg),
  output = resolve(outArg)
await mkdir(output, { recursive: false }) // Do not overwrite an earlier job.
const db = new DatabaseSync(resolve(output, 'review.sqlite'))
db.exec(`pragma journal_mode=WAL; pragma cache_size=-8192;
create table rows(line integer, fingerprint text unique, vehicle_key text, model_id text, date text, km integer, payload text, note_hash text);
create index by_vehicle_date on rows(vehicle_key,date,km);
create table bad_vehicles(vehicle_key text primary key);
create table train_notes(model_id text,note_hash text,primary key(model_id,note_hash));`)
const insert = db.prepare('insert or ignore into rows values(?,?,?,?,?,?,?,?)')
const catalog = createDemoData()
const models = new Set(catalog.vehicles.map((v) => v.id))
const itemModels = new Map(catalog.items.map((i) => [i.id, i.vehicle_id]))
const rejected = createWriteStream(resolve(output, 'review.jsonl'), { flags: 'wx' })
const clean = createWriteStream(resolve(output, 'accepted.jsonl'), { flags: 'wx' })
const write = async (stream, value) => {
  if (!stream.write(JSON.stringify(value) + '\n')) await once(stream, 'drain')
}
const sha = (value) => createHash('sha256').update(value).digest('hex')
const sourceHash = createHash('sha256')
const report = {
  version: 1,
  source: basename(input),
  sha256: '',
  cutoff: cutoff || null,
  read: 0,
  accepted: 0,
  review: 0,
  duplicates: 0,
  train: 0,
  test: 0,
  predicted: 0,
  correct: 0,
  overlapExcluded: 0,
  multipleItemsSkipped: 0,
  accuracyOnAnswered: null,
  coverage: null,
  deployment: 'review-only; not connected to app',
  labels: {},
}
async function reject(line, reason) {
  report.review++
  await write(rejected, { line, reason })
}
// Fixed 64 KiB maximum per record, including one hostile unbroken input line.
async function* lines() {
  let pending = Buffer.alloc(0),
    oversized = false,
    line = 0
  for await (const chunk of createReadStream(input, { highWaterMark: 65536 })) {
    sourceHash.update(chunk)
    let start = 0
    for (let end = 0; end <= chunk.length; end++)
      if (end === chunk.length || chunk[end] === 10) {
        const part = chunk.subarray(start, end)
        if (!oversized) {
          if (pending.length + part.length > 65536) {
            oversized = true
            pending = Buffer.alloc(0)
          } else pending = Buffer.concat([pending, part])
        }
        if (end < chunk.length) {
          yield { line: ++line, text: oversized ? null : pending.toString('utf8').trim() }
          pending = Buffer.alloc(0)
          oversized = false
        }
        start = end + 1
      }
  }
  if (pending.length || oversized)
    yield { line: ++line, text: oversized ? null : pending.toString('utf8').trim() }
}
function validate(r) {
  if (!r || typeof r !== 'object' || Array.isArray(r)) throw Error('Không phải một bản ghi JSON.')
  if (typeof r.vehicle_key !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(r.vehicle_key))
    throw Error('vehicle_key phải là mã giả danh 1–80 ký tự.')
  if (!models.has(r.model_id))
    throw Error('Mẫu xe không thuộc danh mục; cần ánh xạ model_id trước.')
  if (typeof r.date !== 'string' || !validDate(r.date) || r.date > todayISO())
    throw Error('Ngày không hợp lệ hoặc ở tương lai.')
  if (!Number.isSafeInteger(r.km) || r.km < 0 || r.km > 2147483647)
    throw Error('Số km phải là số nguyên không âm.')
  if (r.cost != null && (!Number.isSafeInteger(r.cost) || r.cost < 0 || r.cost > 2147483647))
    throw Error('Chi phí không hợp lệ.')
  if (
    !Array.isArray(r.item_ids) ||
    !r.item_ids.length ||
    r.item_ids.length > 50 ||
    new Set(r.item_ids).size !== r.item_ids.length ||
    r.item_ids.some((id) => itemModels.get(id) !== r.model_id)
  )
    throw Error('Hạng mục thiếu, trùng hoặc sai mẫu xe.')
  if (typeof r.notes !== 'string' || r.notes.length > 2000)
    throw Error('Ghi chú phải là chuỗi tối đa 2000 ký tự.')
  if (r.confirmed !== true) throw Error('Nhãn chưa được người nhập xác nhận.')
  return {
    vehicle_key: r.vehicle_key,
    model_id: r.model_id,
    date: r.date,
    km: r.km,
    item_ids: [...r.item_ids].sort(),
    notes: r.notes.trim(),
    ...(r.cost != null ? { cost: r.cost } : {}),
    confirmed: true,
  }
}
try {
  db.exec('begin')
  for await (const { line, text } of lines()) {
    if (text === '') continue
    report.read++
    if (text === null) {
      await reject(line, 'Dòng vượt 64 KiB; cần tách dữ liệu.')
      continue
    }
    try {
      const r = validate(JSON.parse(text))
      const fingerprint = sha(JSON.stringify([r.vehicle_key, r.model_id, r.date, r.km, r.item_ids]))
      const result = insert.run(
        line,
        fingerprint,
        r.vehicle_key,
        r.model_id,
        r.date,
        r.km,
        JSON.stringify(r),
        sha(normalizeText(r.notes)),
      )
      if (!result.changes) {
        report.duplicates++
        await write(rejected, { line, reason: 'Trùng xe/ngày/km/hạng mục; giữ bản ghi đầu.' })
      }
    } catch (e) {
      await reject(line, e.message)
    }
    if (report.read % 1000 === 0) db.exec('commit; begin')
  }
  db.exec(`commit;
insert or ignore into bad_vehicles select vehicle_key from rows group by vehicle_key having count(distinct model_id)>1;
insert or ignore into bad_vehicles select distinct vehicle_key from (select vehicle_key,km,max(km) over(partition by vehicle_key order by date,km rows between unbounded preceding and 1 preceding) previous from rows) where km<previous;`)
  const trainModels = new Map()
  const trainingNote = db.prepare('insert or ignore into train_notes values(?,?)')
  const overlapping = db.prepare('select 1 from train_notes where model_id=? and note_hash=?')
  for (const row of db
    .prepare('select * from rows where vehicle_key in (select vehicle_key from bad_vehicles)')
    .iterate())
    await reject(
      row.line,
      'Lịch sử xe mâu thuẫn mẫu xe hoặc số km giảm theo ngày; cần kiểm tra cả nhóm xe.',
    )
  for (const row of db
    .prepare(
      'select * from rows where vehicle_key not in (select vehicle_key from bad_vehicles) order by date,line',
    )
    .iterate()) {
    const r = JSON.parse(row.payload)
    report.accepted++
    await write(clean, r)
    if (r.item_ids.length !== 1) {
      report.multipleItemsSkipped++
      continue
    }
    if (!r.notes) continue
    if (cutoff && r.date >= cutoff) continue
    trainingNote.run(r.model_id, row.note_hash)
    const model = trainModels.get(r.model_id) || emptyNoteModel()
    trainNote(model, r.notes, r.item_ids[0])
    trainModels.set(r.model_id, model)
    report.train++
  }
  if (cutoff)
    for (const row of db
      .prepare(
        'select * from rows where date>=? and vehicle_key not in (select vehicle_key from bad_vehicles)',
      )
      .iterate(cutoff)) {
      const r = JSON.parse(row.payload)
      if (r.item_ids.length !== 1 || !r.notes) continue
      if (overlapping.get(r.model_id, row.note_hash)) {
        report.overlapExcluded++
        continue
      }
      report.test++
      const actual = r.item_ids[0]
      const labelStats = (report.labels[actual] ??= { support: 0, predicted: 0, truePositive: 0 })
      labelStats.support++
      const result = classifyNote(trainModels.get(r.model_id) || emptyNoteModel(), r.notes)
      if (result) {
        report.predicted++
        const predictionStats = (report.labels[result.label] ??= {
          support: 0,
          predicted: 0,
          truePositive: 0,
        })
        predictionStats.predicted++
        if (result.label === actual) {
          report.correct++
          labelStats.truePositive++
        }
      }
    }
  report.sha256 = sourceHash.digest('hex')
  report.accuracyOnAnswered = report.predicted ? report.correct / report.predicted : null
  report.coverage = report.test ? report.predicted / report.test : null
  await writeFile(
    resolve(output, 'models.json'),
    JSON.stringify(
      { version: 1, sourceSha256: report.sha256, models: Object.fromEntries(trainModels) },
      null,
      2,
    ),
    { flag: 'wx' },
  )
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2), { flag: 'wx' })
  clean.end()
  rejected.end()
  await Promise.all([once(clean, 'finish'), once(rejected, 'finish')])
  console.log(JSON.stringify(report, null, 2))
} finally {
  db.close()
  clean.destroy()
  rejected.destroy()
}

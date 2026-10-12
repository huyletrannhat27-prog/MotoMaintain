import { createHash } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import './register-shared.mjs'
const { createDemoData } = await import('../shared/demo.ts')
const { officialCatalog } = await import('../shared/knowledge.ts')
const allData = createDemoData()
const data = {
  ...allData,
  vehicles: allData.vehicles.filter((v) => !officialCatalog().vehicles.some((o) => o.id === v.id)),
  items: allData.items.filter((i) => !i.verified),
}
const uuid = (value) => {
  const hex = createHash('md5')
    .update('motomaintain-demo:' + value)
    .digest('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20)}`
}
const literal = (value) =>
  value == null
    ? 'null'
    : typeof value === 'number' || typeof value === 'boolean'
      ? String(value)
      : `'${String(value).replaceAll("'", "''")}'`
const insert = (table, rows) =>
  rows
    .map((row) => {
      const entries = Object.entries(row).filter(
        ([key]) => !['created_at', 'updated_at'].includes(key),
      )
      return `insert into public.${table} (${entries.map(([key]) => key).join(',')}) values (${entries.map(([key, value]) => literal(key === 'id' || key.endsWith('_id') ? uuid(value) : value)).join(',')}) on conflict(id) do nothing;`
    })
    .join('\n')
const sql = `-- OPTIONAL: demo catalog only. All intervals, prices and specifications are illustrative.\n-- Not manufacturer-certified. No users, user vehicles, service history or fake shops are inserted.\n-- Review or replace these entries before using the app for real maintenance advice.\n-- Safe to rerun: deterministic IDs; existing entries are not overwritten.\nbegin;\n${insert('vehicles', data.vehicles)}\n${insert('maintenance_items', data.items)}\n${insert('parts_suggestions', data.parts)}\ncommit;\n`
await writeFile(new URL('../web/supabase/seed-demo.sql', import.meta.url), sql)
const official = officialCatalog()
await writeFile(
  new URL('../web/supabase/seed-official.sql', import.meta.url),
  `-- Honda maintenance facts; visually checked 2026-10-10. Apply schema.sql first.\n-- Scoped models only; does not overwrite generic or user-edited models. Source links stored on each item.\nbegin;\n${insert('vehicles', official.vehicles)}\n${insert('maintenance_items', official.items)}\ncommit;\n`,
)
console.log(
  `Generated demo catalog and official catalog (${official.vehicles.length} models, ${official.items.length} rules).`,
)

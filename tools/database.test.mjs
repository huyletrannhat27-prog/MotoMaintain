import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
const uid = '10000000-0000-4000-8000-000000000001',
  other = '10000000-0000-4000-8000-000000000002',
  admin = '10000000-0000-4000-8000-000000000003'
const model = '20000000-0000-4000-8000-000000000001',
  model2 = '20000000-0000-4000-8000-000000000002'
const vehicle = '30000000-0000-4000-8000-000000000001',
  foreignVehicle = '30000000-0000-4000-8000-000000000002'
const item = '40000000-0000-4000-8000-000000000001',
  foreignItem = '40000000-0000-4000-8000-000000000002'
test('schema, RLS and atomic record writes against local PostgreSQL', async (t) => {
  const db = new PGlite()
  await db.exec(
    `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;`,
  )
  const schema = await readFile(new URL('../web/supabase/schema.sql', import.meta.url), 'utf8')
  await db.exec(schema)
  await t.test('migration is safe to run twice', async () => {
    await db.exec(schema)
  })
  await t.test('optional demo seed is repeatable and explicitly unverified', async () => {
    const seed = await readFile(new URL('../web/supabase/seed-demo.sql', import.meta.url), 'utf8')
    await db.exec(seed)
    await db.exec(seed)
    assert.equal((await db.query('select count(*)::int as n from vehicles')).rows[0].n, 5)
    assert.equal((await db.query('select count(*)::int as n from maintenance_items')).rows[0].n, 20)
    assert.equal(
      (await db.query('select count(*)::int as n from maintenance_items where verified')).rows[0].n,
      0,
    )
  })
  await t.test(
    'official catalog is repeatable and supports time-only and km-only rules',
    async () => {
      const seed = await readFile(
        new URL('../web/supabase/seed-official.sql', import.meta.url),
        'utf8',
      )
      await db.exec(seed)
      await db.exec(seed)
      assert.equal(
        (await db.query('select count(*)::int as n from maintenance_items where verified')).rows[0]
          .n,
        32,
      )
      assert.equal(
        (
          await db.query(
            'select count(*)::int as n from maintenance_items where verified and interval_km=0',
          )
        ).rows[0].n,
        12,
      )
      assert.equal(
        (
          await db.query(
            'select count(*)::int as n from maintenance_items where verified and interval_months=0',
          )
        ).rows[0].n,
        5,
      )
      await assert.rejects(
        db.query('update maintenance_items set first_service_km=-1 where verified'),
      )
    },
  )
  await db.query(
    `insert into auth.users(id,email) values($1,'one@example.test'),($2,'two@example.test'),($3,'admin@example.test')`,
    [uid, other, admin],
  )
  await db.query(`update profiles set role='admin' where id=$1`, [admin])
  await db.query(
    `insert into vehicles(id,name,model,type,engine_cc,oil_capacity_liters) values($1,'One','2024','scooter',110,0.8),($2,'Two','2024','semi-auto',110,0.8)`,
    [model, model2],
  )
  await db.query(
    `insert into maintenance_items(id,vehicle_id,name,interval_km,interval_months) values($1,$2,'Oil',2000,6),($3,$4,'Other model',2000,6)`,
    [item, model, foreignItem, model2],
  )
  await db.query(
    `insert into user_vehicles(id,user_id,vehicle_id,current_km) values($1,$2,$3,13000),($4,$5,$3,1000)`,
    [vehicle, uid, model, foreignVehicle, other],
  )
  async function as(id) {
    await db.exec('reset role')
    await db.query(`select set_config('request.jwt.claim.sub',$1,false)`, [id])
    await db.exec('set role authenticated')
  }
  await as(uid)
  await t.test('only own vehicles visible and profile lookup does not recurse', async () => {
    assert.equal((await db.query('select * from user_vehicles')).rows.length, 1)
    assert.equal((await db.query('select * from profiles')).rows.length, 1)
  })
  await t.test('profile cannot self-promote and normal user cannot edit catalog', async () => {
    await assert.rejects(db.query(`update profiles set role='admin' where id=$1`, [uid]))
    assert.equal(
      (await db.query(`update vehicles set name='hacked' where id=$1 returning id`, [model])).rows
        .length,
      0,
    )
  })
  const save = (id, v, date, odo, items) =>
    db.query('select save_maintenance_record($1,$2,$3,$4,$5,$6,$7,$8) as id', [
      id,
      v,
      date,
      odo,
      items,
      0,
      'Test shop',
      null,
    ])
  await t.test('rejects cross-owner and wrong-model records', async () => {
    await assert.rejects(save(null, foreignVehicle, '2026-01-01', 1000, [item]))
    await assert.rejects(save(null, vehicle, '2026-01-01', 1000, [foreignItem]))
    assert.equal((await db.query('select * from maintenance_records')).rows.length, 0)
  })
  let recordId
  await t.test('backdated record does not reduce current km', async () => {
    recordId = (await save(null, vehicle, '2026-01-01', 10000, [item])).rows[0].id
    assert.equal(
      (await db.query('select current_km from user_vehicles where id=$1', [vehicle])).rows[0]
        .current_km,
      13000,
    )
  })
  await t.test(
    'new service atomically advances km; invalid write leaves km unchanged',
    async () => {
      await save(null, vehicle, '2026-02-01', 14000, [item])
      assert.equal(
        (await db.query('select current_km from user_vehicles where id=$1', [vehicle])).rows[0]
          .current_km,
        14000,
      )
      await assert.rejects(save(null, vehicle, '2026-03-01', 15000, [foreignItem]))
      assert.equal(
        (await db.query('select current_km from user_vehicles where id=$1', [vehicle])).rows[0]
          .current_km,
        14000,
      )
      await assert.rejects(save(null, vehicle, '2026-01-15', 15000, [item]))
    },
  )
  await t.test('direct writes obey same validation and ownership cannot change', async () => {
    await assert.rejects(db.query(`update user_vehicles set current_km=1 where id=$1`, [vehicle]))
    await assert.rejects(
      db.query(`update user_vehicles set user_id=$1 where id=$2`, [other, vehicle]),
    )
    await assert.rejects(
      db.query(`update maintenance_records set user_vehicle_id=$1 where id=$2`, [
        foreignVehicle,
        recordId,
      ]),
    )
    await assert.rejects(save(null, vehicle, '2099-01-01', 16000, [item]))
  })
  await as(other)
  await t.test('second account cannot read or edit first account history', async () => {
    assert.equal((await db.query('select * from maintenance_records')).rows.length, 0)
    await assert.rejects(save(recordId, vehicle, '2026-01-01', 10000, [item]))
    assert.equal(
      (await db.query('delete from maintenance_records where id=$1 returning id', [recordId])).rows
        .length,
      0,
    )
  })
  await as(admin)
  await t.test('admin can manage catalog but cannot delete referenced items', async () => {
    assert.equal(
      (
        await db.query(`update vehicles set description='Updated' where id=$1 returning id`, [
          model,
        ])
      ).rows.length,
      1,
    )
    await assert.rejects(db.query('delete from maintenance_items where id=$1', [item]))
    await assert.rejects(
      db.query('update maintenance_items set interval_km=0,interval_months=0 where id=$1', [item]),
    )
    await assert.rejects(db.query('update maintenance_items set verified=true where id=$1', [item]))
  })
  await as(uid)
  await t.test('deleting record keeps the actual odometer', async () => {
    await db.query('delete from maintenance_records where id=$1', [recordId])
    assert.equal(
      (await db.query('select current_km from user_vehicles where id=$1', [vehicle])).rows[0]
        .current_km,
      14000,
    )
  })
  await db.close()
})

import './register-shared.mjs'
const { createDemoData } = await import('../shared/demo.ts')
const { vehicles, items } = createDemoData()
console.log(
  JSON.stringify(
    vehicles.map((v) => ({
      model_id: v.id,
      name: v.name,
      model: v.model,
      type: v.type,
      items: items
        .filter((i) => i.vehicle_id === v.id)
        .map((i) => ({
          item_id: i.id,
          name: i.name,
          verified: i.verified,
          source_url: i.source_url,
        })),
    })),
    null,
    2,
  ),
)

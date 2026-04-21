const pg = require('pg');
const p = new pg.Pool({
  host: 'localhost', port: 5432,
  user: 'safedify_user', password: 'safedify_pass', database: 'safedify'
});

async function run() {
  // 1. Check column types
  const cols = await p.query(
    "SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name = 'incidents' ORDER BY ordinal_position"
  );
  console.log('=== Column types ===');
  cols.rows.forEach(r => console.log(r.column_name.padEnd(32), r.data_type.padEnd(20), r.udt_name));

  // 2. Test INSERT with JSON.stringify([]) for images (simulating production bug)
  console.log('\n=== Test INSERT with JSON.stringify([]) for images ===');
  const testId = '00000000-0000-0000-0000-000000000099';
  try {
    await p.query('DELETE FROM incidents WHERE id = $1', [testId]);
    await p.query(
      `INSERT INTO incidents (id, description, location, date, type, category, severity, status, reported_by, image, images,
        root_cause, corrective_actions, days_lost, body_part, mechanism, immediate_action,
        date_reported, department, shift, weather_conditions, task_being_performed,
        injured_persons, witnesses, ppe_worn, ppe_adequate, environmental_impact,
        immediate_actions_taken, area_secured, emergency_services_notified, regulatory_notification, org_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32)`,
      [testId, 'test', 'loc', new Date().toISOString(), 'Near Miss', 'Near Miss',
       'Low', 'Open', null, null,
       JSON.stringify([]),  // ← simulating what production sends for images TEXT[]
       null, null, 0, null, null, null,
       new Date().toISOString(), null, null, null, null,
       null, null, null, null, null, null, false, false, false, null]
    );
    console.log('INSERT with JSON.stringify([]) SUCCEEDED');
    await p.query('DELETE FROM incidents WHERE id = $1', [testId]);
  } catch (e) {
    console.log('INSERT with JSON.stringify([]) FAILED:', e.message);
  }

  // 3. Test INSERT with JS array for images (the fix)
  console.log('\n=== Test INSERT with [] directly for images ===');
  try {
    await p.query('DELETE FROM incidents WHERE id = $1', [testId]);
    await p.query(
      `INSERT INTO incidents (id, description, location, date, type, category, severity, status, reported_by, image, images,
        root_cause, corrective_actions, days_lost, body_part, mechanism, immediate_action,
        date_reported, department, shift, weather_conditions, task_being_performed,
        injured_persons, witnesses, ppe_worn, ppe_adequate, environmental_impact,
        immediate_actions_taken, area_secured, emergency_services_notified, regulatory_notification, org_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32)`,
      [testId, 'test', 'loc', new Date().toISOString(), 'Near Miss', 'Near Miss',
       'Low', 'Open', null, null,
       [],  // ← passing JS array directly
       null, null, 0, null, null, null,
       new Date().toISOString(), null, null, null, null,
       null, null, null, null, null, null, false, false, false, null]
    );
    console.log('INSERT with [] directly SUCCEEDED');
    await p.query('DELETE FROM incidents WHERE id = $1', [testId]);
  } catch (e) {
    console.log('INSERT with [] directly FAILED:', e.message);
  }

  await p.end();
}

run().catch(e => { console.error(e); p.end(); });

export async function onRequestGet({ env }) {
  try {
    const { results } = await env.DB.prepare(
      `SELECT key, value FROM app_settings
       WHERE key IN ('start_alarm_duration_seconds','end_reminder_minutes_before','end_reminder_beep_seconds','end_reminder_beep_count')`
    ).all();
    const settings = {};
    results.forEach(r => { settings[r.key] = r.value; });
    return new Response(JSON.stringify({ success: true, settings }), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

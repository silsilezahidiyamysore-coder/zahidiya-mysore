export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const allowed = ['start_alarm_duration_seconds','end_reminder_minutes_before','end_reminder_beep_seconds','end_reminder_beep_count'];
    for (const key of allowed) {
      if (body[key] !== undefined) {
        await env.DB.prepare(
          `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`
        ).bind(key, String(body[key])).run();
      }
    }
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

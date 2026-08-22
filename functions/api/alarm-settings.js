// GET /api/alarm-settings -> current settings laata hai
// POST /api/alarm-settings -> Admin naye settings save karta hai

export async function onRequestGet(context) {
  const db = context.env.DB;
  try {
    const settings = await db
      .prepare('SELECT * FROM alarm_settings WHERE id = 1')
      .first();
    return Response.json({ settings });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

export async function onRequestPost(context) {
  const db = context.env.DB;
  try {
    const body = await context.request.json();

    // Pehle current row nikalo taaki jo field bheji nahi gayi wo purani hi rahe
    const existing = await db.prepare('SELECT * FROM alarm_settings WHERE id = 1').first();

    const start_alarm_enabled = body.start_alarm_enabled !== undefined ? (body.start_alarm_enabled ? 1 : 0) : existing.start_alarm_enabled;
    const start_alarm_duration_seconds = body.start_alarm_duration_seconds !== undefined ? body.start_alarm_duration_seconds : existing.start_alarm_duration_seconds;
    const end_reminder_enabled = body.end_reminder_enabled !== undefined ? (body.end_reminder_enabled ? 1 : 0) : existing.end_reminder_enabled;
    const end_reminder_minutes_before = body.end_reminder_minutes_before !== undefined ? body.end_reminder_minutes_before : existing.end_reminder_minutes_before;
    const end_reminder_repeat_count = body.end_reminder_repeat_count !== undefined ? body.end_reminder_repeat_count : existing.end_reminder_repeat_count;
    const end_reminder_beep_seconds = body.end_reminder_beep_seconds !== undefined ? body.end_reminder_beep_seconds : existing.end_reminder_beep_seconds;
    const custom_alarm_enabled = body.custom_alarm_enabled !== undefined ? (body.custom_alarm_enabled ? 1 : 0) : (existing.custom_alarm_enabled || 0);
    const custom_alarm_title = body.custom_alarm_title !== undefined ? body.custom_alarm_title : (existing.custom_alarm_title || '');
    const custom_alarm_start = body.custom_alarm_start !== undefined ? body.custom_alarm_start : (existing.custom_alarm_start || '');
    const custom_alarm_end = body.custom_alarm_end !== undefined ? body.custom_alarm_end : (existing.custom_alarm_end || '');
    const khanqah_address = body.khanqah_address !== undefined ? body.khanqah_address : (existing.khanqah_address || '');
    const khanqah_map_link = body.khanqah_map_link !== undefined ? body.khanqah_map_link : (existing.khanqah_map_link || '');
    const alarm_tone_url = body.alarm_tone_url !== undefined ? body.alarm_tone_url : (existing.alarm_tone_url || '');

    await db
      .prepare(`
        UPDATE alarm_settings SET
          start_alarm_enabled = ?,
          start_alarm_duration_seconds = ?,
          end_reminder_enabled = ?,
          end_reminder_minutes_before = ?,
          end_reminder_repeat_count = ?,
          end_reminder_beep_seconds = ?,
          custom_alarm_enabled = ?,
          custom_alarm_title = ?,
          custom_alarm_start = ?,
          custom_alarm_end = ?,
          khanqah_address = ?,
          khanqah_map_link = ?,
          alarm_tone_url = ?,
          updated_at = datetime('now')
        WHERE id = 1
      `)
      .bind(
        start_alarm_enabled,
        start_alarm_duration_seconds,
        end_reminder_enabled,
        end_reminder_minutes_before,
        end_reminder_repeat_count,
        end_reminder_beep_seconds,
        custom_alarm_enabled,
        custom_alarm_title,
        custom_alarm_start,
        custom_alarm_end,
        khanqah_address,
        khanqah_map_link,
        alarm_tone_url
      )
      .run();

    return Response.json({ message: 'Alarm settings updated successfully' });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

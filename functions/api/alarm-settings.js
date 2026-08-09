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
    const {
      start_alarm_enabled,
      start_alarm_duration_seconds,
      end_reminder_enabled,
      end_reminder_minutes_before,
      end_reminder_repeat_count,
      end_reminder_beep_seconds
    } = body;

    await db
      .prepare(`
        UPDATE alarm_settings SET
          start_alarm_enabled = ?,
          start_alarm_duration_seconds = ?,
          end_reminder_enabled = ?,
          end_reminder_minutes_before = ?,
          end_reminder_repeat_count = ?,
          end_reminder_beep_seconds = ?,
          updated_at = datetime('now')
        WHERE id = 1
      `)
      .bind(
        start_alarm_enabled ? 1 : 0,
        start_alarm_duration_seconds,
        end_reminder_enabled ? 1 : 0,
        end_reminder_minutes_before,
        end_reminder_repeat_count,
        end_reminder_beep_seconds
      )
      .run();

    return Response.json({ message: 'Alarm settings updated successfully' });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

// GET /api/alarm-settings -> current settings laata hai
// POST /api/alarm-settings -> Admin naye settings save karta hai
import { sendRefreshSettingsPush } from './fcm-helper.js';

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

// Custom alarm ke content (text/image/audio/PDF) ke liye 3 naye column chahiye.
// Agar database mein nahi hain to yahin apne aap ban jaate hain (kuch manually
// karne ki zaroorat nahi). Fail ho to false deta hai, baaki save phir bhi chalta hai.
async function ensureCustomContentColumns(db) {
  try {
    const info = await db.prepare('PRAGMA table_info(alarm_settings)').all();
    const have = new Set((info.results || []).map(r => r.name));
    const cols = [
      ['custom_alarm_content_type', "TEXT DEFAULT 'none'"],
      ['custom_alarm_content_text', "TEXT DEFAULT ''"],
      ['custom_alarm_file_url', "TEXT DEFAULT ''"]
    ];
    for (const [name, def] of cols) {
      if (!have.has(name)) {
        await db.prepare('ALTER TABLE alarm_settings ADD COLUMN ' + name + ' ' + def).run();
      }
    }
    return true;
  } catch (e) {
    return false;
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
    const event_tone_url = body.event_tone_url !== undefined ? body.event_tone_url : (existing.event_tone_url || '');
    const live_class_tone_url = body.live_class_tone_url !== undefined ? body.live_class_tone_url : (existing.live_class_tone_url || '');
    const custom_alarm_tone_url = body.custom_alarm_tone_url !== undefined ? body.custom_alarm_tone_url : (existing.custom_alarm_tone_url || '');

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
          event_tone_url = ?,
          live_class_tone_url = ?,
          custom_alarm_tone_url = ?,
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
        alarm_tone_url,
        event_tone_url,
        live_class_tone_url,
        custom_alarm_tone_url
      )
      .run();

    // Custom alarm ka content (alag se save — taaki upar wala purana save kabhi na bigde)
    if (body.custom_alarm_content_type !== undefined && await ensureCustomContentColumns(db)) {
      await db
        .prepare(`UPDATE alarm_settings SET
          custom_alarm_content_type = ?,
          custom_alarm_content_text = ?,
          custom_alarm_file_url = ?
          WHERE id = 1`)
        .bind(
          body.custom_alarm_content_type || 'none',
          body.custom_alarm_content_text || '',
          body.custom_alarm_file_url || ''
        )
        .run();
    }

    // Sabhi mureedon ki app ko turant naya tone/duration fetch karne ka signal bhejo
    context.waitUntil(sendRefreshSettingsPush(context.env).catch(() => {}));

    return Response.json({ message: 'Alarm settings updated successfully' });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

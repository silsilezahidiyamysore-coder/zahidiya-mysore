// functions/api/events.js
// GET  -> saare events ki list deta hai
// POST -> naya event banata hai (id na ho), ya purana update karta hai (id ho)

export async function onRequestGet(context) {
  try {
    const db = context.env.DB;
    const { results } = await db.prepare(
      `SELECT * FROM events ORDER BY created_at DESC`
    ).all();
    return Response.json({ success: true, events: results });
  } catch (err) {
    return Response.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function onRequestPost(context) {
  try {
    const db = context.env.DB;
    const body = await context.request.json();

    const {
      id, title, repeat_type, day_of_week, day_of_month, event_date,
      start_time, end_time, group_type, content_type, content_text, file_url
    } = body;

    if (!title || !repeat_type || !start_time || !end_time || !group_type) {
      return Response.json({ success: false, message: "Zaroori fields missing hain" }, { status: 400 });
    }

    if (id) {
      // Update existing event
      await db.prepare(
        `UPDATE events SET
          title = ?, repeat_type = ?, day_of_week = ?, day_of_month = ?, event_date = ?,
          start_time = ?, end_time = ?, group_type = ?, content_type = ?, content_text = ?, file_url = ?
        WHERE id = ?`
      ).bind(
        title, repeat_type, day_of_week ?? null, day_of_month ?? null, event_date ?? null,
        start_time, end_time, group_type, content_type ?? 'none', content_text ?? '', file_url ?? '',
        id
      ).run();
      return Response.json({ success: true, message: "Event update ho gaya" });
    } else {
      // Create new event
      await db.prepare(
        `INSERT INTO events
          (title, repeat_type, day_of_week, day_of_month, event_date, start_time, end_time, group_type, content_type, content_text, file_url, is_enabled, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`
      ).bind(
        title, repeat_type, day_of_week ?? null, day_of_month ?? null, event_date ?? null,
        start_time, end_time, group_type, content_type ?? 'none', content_text ?? '', file_url ?? '',
        new Date().toISOString()
      ).run();
      return Response.json({ success: true, message: "Event add ho gaya" });
    }
  } catch (err) {
    return Response.json({ success: false, message: err.message }, { status: 500 });
  }
}

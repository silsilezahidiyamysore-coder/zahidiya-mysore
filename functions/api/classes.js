// GET /api/classes?group=mardana|zanana|both
// Us group ke saare classes wapas karta hai (unke group + 'both' waale)
// POST /api/classes
// Body: { title, type, file_url, group_type, is_live }
// Nayi class save karta hai aur ek notification bhi banata hai (sabhi approved mureeds ke liye)

export async function onRequestGet(context) {
  const db = context.env.DB;
  try {
    const url = new URL(context.request.url);
    const group = url.searchParams.get('group') || 'both';

    const { results } = await db
      .prepare(
        `SELECT id, title, type, file_url, group_type, uploaded_at, is_live
         FROM classes
         WHERE group_type = ? OR group_type = 'both'
         ORDER BY is_live DESC, uploaded_at DESC`
      )
      .bind(group)
      .all();

    return Response.json({ classes: results });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

export async function onRequestPost(context) {
  const db = context.env.DB;

  try {
    const body = await context.request.json();
    const title = (body.title || '').trim();
    const type = body.type;
    const file_url = (body.file_url || '').trim();
    const group_type = body.group_type || 'both';
    const is_live = body.is_live ? 1 : 0;

    if (!title) {
      return Response.json({ error: 'Title zaroori hai' }, { status: 400 });
    }
    if (!['audio', 'video', 'pdf', 'link'].includes(type)) {
      return Response.json({ error: 'Type sahi nahi hai' }, { status: 400 });
    }
    if (!file_url) {
      return Response.json({ error: 'File URL zaroori hai' }, { status: 400 });
    }

    const insertResult = await db
      .prepare(
        `INSERT INTO classes (title, type, file_url, group_type, is_live)
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(title, type, file_url, group_type, is_live)
      .run();

    const newClassId = insertResult.meta.last_row_id;

    // Notification bhi banayen taake sab approved mureeds ko dikhe, aur click karne par seedha class khul jaaye
    const notifText = is_live
      ? `🔴 LIVE shuru hui: "${title}"`
      : `Nayi class upload hui: "${title}"`;

    await db
      .prepare(
        `INSERT INTO notifications (message, target_role, is_read, target_mobile, related_class_id)
         VALUES (?, 'mureed', 0, NULL, ?)`
      )
      .bind(notifText, newClassId)
      .run();

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

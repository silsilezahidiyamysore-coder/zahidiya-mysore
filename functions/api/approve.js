// POST /api/approve
// Body: { mobile }
// Pending se approved list mein le jaata hai, mureed ko notification bhejta hai

export async function onRequestPost(context) {
  const db = context.env.DB;

  try {
    const body = await context.request.json();
    const mobile = (body.mobile || '').trim();
    if (!mobile) {
      return Response.json({ error: 'Mobile zaroori hai' }, { status: 400 });
    }

    const pending = await db
      .prepare('SELECT * FROM pending_mureeds WHERE mobile = ?')
      .bind(mobile)
      .first();

    if (!pending) {
      return Response.json({ error: 'not_found' }, { status: 404 });
    }

    const now = Date.now();

    await db
      .prepare('INSERT INTO approved_mureeds (mobile, name, group_name, created_at) VALUES (?, ?, ?, ?)')
      .bind(pending.mobile, pending.name, pending.group_name, now)
      .run();

    await db
      .prepare('DELETE FROM pending_mureeds WHERE mobile = ?')
      .bind(mobile)
      .run();

    await db
      .prepare(
        `INSERT INTO notifications (id, text, time_label, class_id, for_admin_only, is_registration, for_mobile, created_at)
         VALUES (?, ?, ?, NULL, 0, 0, ?, ?)`
      )
      .bind(
        'n-' + Date.now() + '-' + Math.floor(Math.random() * 10000),
        '🎉 Aapko access mil gaya! Ab aap saari classes dekh sakte hain.',
        new Date(now).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        mobile,
        now
      )
      .run();

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

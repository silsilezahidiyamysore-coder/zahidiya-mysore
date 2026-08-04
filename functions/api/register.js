// POST /api/register
// Body: { name, mobile, group }
// Naya mureed register karta hai — pending list mein jata hai, admin ko notification jaati hai

export async function onRequestPost(context) {
  const db = context.env.DB;

  try {
    const body = await context.request.json();
    const name = (body.name || '').trim();
    const mobile = (body.mobile || '').trim();
    const group = body.group === 'Zanana' ? 'Zanana' : 'Mardana';

    if (!name || !mobile) {
      return Response.json({ error: 'Naam aur mobile zaroori hain' }, { status: 400 });
    }

    const alreadyApproved = await db
      .prepare('SELECT mobile FROM approved_mureeds WHERE mobile = ?')
      .bind(mobile)
      .first();
    if (alreadyApproved) {
      return Response.json({ error: 'already_approved' }, { status: 409 });
    }

    const alreadyPending = await db
      .prepare('SELECT mobile FROM pending_mureeds WHERE mobile = ?')
      .bind(mobile)
      .first();
    if (alreadyPending) {
      return Response.json({ error: 'already_pending' }, { status: 409 });
    }

    const now = Date.now();
    await db
      .prepare('INSERT INTO pending_mureeds (mobile, name, group_name, created_at) VALUES (?, ?, ?, ?)')
      .bind(mobile, name, group, now)
      .run();

    await db
      .prepare(
        `INSERT INTO notifications (id, text, time_label, class_id, for_admin_only, is_registration, for_mobile, created_at)
         VALUES (?, ?, ?, NULL, 1, 1, NULL, ?)`
      )
      .bind(
        'n-' + Date.now() + '-' + Math.floor(Math.random() * 10000),
        `👤 Nayi darkhwast: ${name} (${mobile}) — ${group}`,
        new Date(now).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        now
      )
      .run();

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

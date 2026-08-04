// POST /api/direct-add
// Body: { name, mobile, group }
// Admin bina darkhwast ke seedha mureed add karta hai

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

    const already = await db
      .prepare('SELECT mobile FROM approved_mureeds WHERE mobile = ?')
      .bind(mobile)
      .first();
    if (already) {
      return Response.json({ error: 'already_exists' }, { status: 409 });
    }

    await db
      .prepare('INSERT INTO approved_mureeds (mobile, name, group_name, created_at) VALUES (?, ?, ?, ?)')
      .bind(mobile, name, group, Date.now())
      .run();

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

// POST /api/update-class
// Body: { id, title, group_type }
// Kisi class ka naam ya group badal deta hai

export async function onRequestPost(context) {
  const db = context.env.DB;

  try {
    const body = await context.request.json();
    const id = body.id;
    const title = (body.title || '').trim();
    const group_type = body.group_type;

    if (!id || !title) {
      return Response.json({ error: 'id aur title zaroori hai' }, { status: 400 });
    }
    if (!['both', 'mardana', 'zanana'].includes(group_type)) {
      return Response.json({ error: 'Group sahi nahi hai' }, { status: 400 });
    }

    await db
      .prepare('UPDATE classes SET title = ?, group_type = ? WHERE id = ?')
      .bind(title, group_type, id)
      .run();

    return Response.json({ message: 'updated' });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

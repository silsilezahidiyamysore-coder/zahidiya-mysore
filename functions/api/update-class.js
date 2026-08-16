// POST /api/update-class
// Body: { id, title, type, file_url, group_type, is_live }
// Kisi class ka naam, file/link, group, ya live status badal deta hai

export async function onRequestPost(context) {
  const db = context.env.DB;

  try {
    const body = await context.request.json();
    const id = body.id;
    const title = (body.title || '').trim();
    const group_type = body.group_type;
    const type = body.type;
    const file_url = (body.file_url || '').trim();
    const is_live = body.is_live ? 1 : 0;

    if (!id || !title) {
      return Response.json({ error: 'id aur title zaroori hai' }, { status: 400 });
    }
    if (!['both', 'mardana', 'zanana'].includes(group_type)) {
      return Response.json({ error: 'Group sahi nahi hai' }, { status: 400 });
    }
    if (!['audio', 'video', 'pdf', 'link'].includes(type)) {
      return Response.json({ error: 'Type sahi nahi hai' }, { status: 400 });
    }
    if (!file_url) {
      return Response.json({ error: 'File URL zaroori hai' }, { status: 400 });
    }

    await db
      .prepare('UPDATE classes SET title = ?, type = ?, file_url = ?, group_type = ?, is_live = ? WHERE id = ?')
      .bind(title, type, file_url, group_type, is_live, id)
      .run();

    return Response.json({ message: 'updated' });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

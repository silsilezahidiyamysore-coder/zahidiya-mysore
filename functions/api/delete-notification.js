// POST /api/delete-notification
// Body: { id }
// Ek notification ko database se hamesha ke liye delete kar deta hai

export async function onRequestPost(context) {
  const db = context.env.DB;

  try {
    const body = await context.request.json();
    const id = body.id;

    if (!id) {
      return Response.json({ error: 'id zaroori hai' }, { status: 400 });
    }

    await db.prepare('DELETE FROM notifications WHERE id = ?').bind(id).run();

    return Response.json({ message: 'deleted' });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

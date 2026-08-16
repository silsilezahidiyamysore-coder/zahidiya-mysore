// POST /api/delete-class
// Body: { id }
// Kisi class ko hamesha ke liye delete kar deta hai

export async function onRequestPost(context) {
  const db = context.env.DB;

  try {
    const body = await context.request.json();
    const id = body.id;

    if (!id) {
      return Response.json({ error: 'id zaroori hai' }, { status: 400 });
    }

    await db.prepare('DELETE FROM classes WHERE id = ?').bind(id).run();

    return Response.json({ message: 'deleted' });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

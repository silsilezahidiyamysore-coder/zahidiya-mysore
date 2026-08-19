// POST /api/delete-mureed
// Body: { id }
// Mureed ko hamesha ke liye database se delete kar deta hai.

export async function onRequestPost(context) {
  const db = context.env.DB;

  try {
    const body = await context.request.json();
    const id = body.id;

    if (!id) {
      return Response.json({ error: 'id zaroori hai' }, { status: 400 });
    }

    await db
      .prepare('DELETE FROM mureeds WHERE id = ?')
      .bind(id)
      .run();

    return Response.json({ message: 'deleted' });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

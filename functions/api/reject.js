// POST /api/reject
// Body: { id }

export async function onRequestPost(context) {
  const db = context.env.DB;

  try {
    const body = await context.request.json();
    const id = body.id;
    if (!id) {
      return Response.json({ error: 'id zaroori hai' }, { status: 400 });
    }

    await db
      .prepare("UPDATE mureeds SET status = 'rejected' WHERE id = ?")
      .bind(id)
      .run();

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

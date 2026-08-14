// POST /api/approve
// Body: { id }

export async function onRequestPost(context) {
  const db = context.env.DB;

  try {
    const body = await context.request.json();
    const id = body.id;
    if (!id) {
      return Response.json({ error: 'id zaroori hai' }, { status: 400 });
    }

    const mureed = await db
      .prepare("SELECT * FROM mureeds WHERE id = ? AND status = 'pending'")
      .bind(id)
      .first();

    if (!mureed) {
      return Response.json({ error: 'not_found' }, { status: 404 });
    }

    await db
      .prepare("UPDATE mureeds SET status = 'approved' WHERE id = ?")
      .bind(id)
      .run();

  await db
      .prepare(
        `INSERT INTO notifications (message, target_role, is_read, target_mobile)
         VALUES (?, 'mureed', 0, ?)`
      )
      .bind('🎉 Aapko access mil gaya! Ab aap saari classes dekh sakte hain.', mureed.mobile)
      .run();

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

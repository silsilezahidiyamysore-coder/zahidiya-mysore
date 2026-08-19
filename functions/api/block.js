// POST /api/block
// Body: { id, blocked }   blocked = 1 (block karo) ya 0 (unblock karo)
// Mureed ko block/unblock karta hai. Blocked mureed login nahi kar payega.

export async function onRequestPost(context) {
  const db = context.env.DB;

  try {
    const body = await context.request.json();
    const id = body.id;
    const is_blocked = body.blocked ? 1 : 0;

    if (!id) {
      return Response.json({ error: 'id zaroori hai' }, { status: 400 });
    }

    await db
      .prepare('UPDATE mureeds SET is_blocked = ? WHERE id = ?')
      .bind(is_blocked, id)
      .run();

    return Response.json({ message: is_blocked ? 'blocked' : 'unblocked' });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

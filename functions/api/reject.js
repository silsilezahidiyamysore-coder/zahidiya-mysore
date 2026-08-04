// POST /api/reject
// Body: { mobile }

export async function onRequestPost(context) {
  const db = context.env.DB;

  try {
    const body = await context.request.json();
    const mobile = (body.mobile || '').trim();
    if (!mobile) {
      return Response.json({ error: 'Mobile zaroori hai' }, { status: 400 });
    }

    await db
      .prepare('DELETE FROM pending_mureeds WHERE mobile = ?')
      .bind(mobile)
      .run();

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

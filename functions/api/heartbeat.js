// POST /api/heartbeat
// Body: { mobile }
// Jab tak mureed ka app khula hai, yeh har kuch second mein call hoti hai
// taaki admin ko pata chal sake kaun abhi online hai.

export async function onRequestPost(context) {
  const db = context.env.DB;

  try {
    const body = await context.request.json();
    const mobile = (body.mobile || '').trim();

    if (!mobile) {
      return Response.json({ error: 'mobile zaroori hai' }, { status: 400 });
    }

    await db
      .prepare("UPDATE mureeds SET last_active = datetime('now') WHERE mobile = ?")
      .bind(mobile)
      .run();

    return Response.json({ message: 'ok' });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

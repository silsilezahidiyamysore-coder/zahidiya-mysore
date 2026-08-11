// POST /api/approve
// Body: { mobile }
// Mureed ki status 'pending' se 'approved' karta hai, notification bhejta hai

export async function onRequestPost(context) {
  const db = context.env.DB;

  try {
    const body = await context.request.json();
    const mobile = (body.mobile || '').trim();
    if (!mobile) {
      return Response.json({ error: 'Mobile zaroori hai' }, { status: 400 });
    }

    const mureed = await db
      .prepare("SELECT * FROM mureeds WHERE mobile = ? AND status = 'pending'")
      .bind(mobile)
      .first();

    if (!mureed) {
      return Response.json({ error: 'not_found' }, { status: 404 });
    }

    await db
      .prepare("UPDATE mureeds SET status = 'approved' WHERE mobile = ?")
      .bind(mobile)
      .run();

    await db
      .prepare(
        `INSERT INTO notifications (message, target_role, is_read)
         VALUES (?, 'mureed', 0)`
      )
      .bind('🎉 Aapko access mil gaya! Ab aap saari classes dekh sakte hain.')
      .run();

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

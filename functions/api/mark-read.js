// POST /api/mark-read
// Body: { role, mobile }
// Role ke hisaab se relevant notifications ko is_read = 1 kar deta hai

export async function onRequestPost(context) {
  const db = context.env.DB;

  try {
    const body = await context.request.json();
    const role = body.role;
    const mobile = body.mobile || '';

    if (role === 'admin') {
      await db
        .prepare("UPDATE notifications SET is_read = 1 WHERE target_role = 'admin'")
        .run();
    } else {
      await db
        .prepare(
          `UPDATE notifications SET is_read = 1
           WHERE target_role = 'mureed' AND (target_mobile IS NULL OR target_mobile = ?)`
        )
        .bind(mobile)
        .run();
    }

    return Response.json({ message: 'ok' });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

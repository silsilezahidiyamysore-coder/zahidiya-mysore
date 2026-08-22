// POST /api/heartbeat
// Body: { mobile, offline }
// Jab tak mureed ka app khula hai, yeh har kuch second mein call hoti hai
// taaki admin ko pata chal sake kaun abhi online hai.
// offline: true bhejne par turant "offline" mark ho jaata hai (logout ke waqt use hota hai)

export async function onRequestPost(context) {
  const db = context.env.DB;

  try {
    const body = await context.request.json();
    const mobile = (body.mobile || '').trim();
    const offline = !!body.offline;

    if (!mobile) {
      return Response.json({ error: 'mobile zaroori hai' }, { status: 400 });
    }

    if (offline) {
      // Bahut purani date daal do taaki turant "offline" dikhe, wait na karna pade
      await db
        .prepare("UPDATE mureeds SET last_active = datetime('now', '-1 day') WHERE mobile = ?")
        .bind(mobile)
        .run();
    } else {
      await db
        .prepare("UPDATE mureeds SET last_active = datetime('now') WHERE mobile = ?")
        .bind(mobile)
        .run();
    }

    return Response.json({ message: 'ok' });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

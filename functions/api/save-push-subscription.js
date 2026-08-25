export async function onRequestPost(context) {
  try {
    const db = context.env.DB;
    const body = await context.request.json();
    const { mobile, subscription } = body;

    if (!mobile || !subscription || !subscription.endpoint || !subscription.keys) {
      return Response.json({ success: false, message: "mobile aur subscription chahiye" }, { status: 400 });
    }

    const endpoint = subscription.endpoint;
    const p256dh = subscription.keys.p256dh;
    const auth = subscription.keys.auth;

    await db.prepare(`DELETE FROM push_subscriptions WHERE mobile = ?`).bind(mobile).run();
    await db.prepare(
      `INSERT INTO push_subscriptions (mobile, endpoint, p256dh, auth, created_at) VALUES (?, ?, ?, ?, ?)`
    ).bind(mobile, endpoint, p256dh, auth, new Date().toISOString()).run();

    return Response.json({ success: true, message: "Notification ON ho gaya" });
  } catch (err) {
    return Response.json({ success: false, message: err.message }, { status: 500 });
  }
}

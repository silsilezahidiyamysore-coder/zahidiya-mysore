// GET /api/state
// Alag alag query params ke hisaab se alag data deta hai:
// 1) mobile & password -> login check
// 2) notifications=1 -> notifications ki list
// 3) admin=1 -> admin stats + pending list
// 4) kuch nahi -> bas classes ki list

export async function onRequestGet(context) {
  const db = context.env.DB;
  const url = new URL(context.request.url);
  const mobile = url.searchParams.get('mobile');
  const password = url.searchParams.get('password');
  const notifications = url.searchParams.get('notifications');
  const admin = url.searchParams.get('admin');

  try {
    // 1) LOGIN CHECK
    if (mobile && password) {
      const user = await db
        .prepare('SELECT * FROM mureeds WHERE mobile = ? AND password = ?')
        .bind(mobile, password)
        .first();

      if (!user) {
        return Response.json({ message: 'Invalid mobile or password' }, { status: 401 });
      }

      return Response.json({
        user: {
          id: user.id,
          name: user.name,
          mobile: user.mobile,
          group_type: user.group_type,
          role: user.role,
          status: user.status
        }
      });
    }

    // 2) NOTIFICATIONS
    if (notifications) {
      const notifRes = await db
        .prepare('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 100')
        .all();
      return Response.json({ notifications: notifRes.results });
    }

    // 3) ADMIN STATS + PENDING LIST
    if (admin) {
      const totalRes = await db.prepare('SELECT COUNT(*) as count FROM mureeds WHERE role = "mureed"').first();
      const mardanaRes = await db.prepare("SELECT COUNT(*) as count FROM mureeds WHERE role = 'mureed' AND group_type = 'mardana'").first();
      const zananaRes = await db.prepare("SELECT COUNT(*) as count FROM mureeds WHERE role = 'mureed' AND group_type = 'zanana'").first();
      const pendingRes = await db.prepare("SELECT * FROM mureeds WHERE status = 'pending' ORDER BY created_at ASC").all();

      return Response.json({
        total: totalRes.count,
        mardana: mardanaRes.count,
        zanana: zananaRes.count,
        pending: pendingRes.results
      });
    }

    // 4) DEFAULT: kuch nahi mila to khaali response
    return Response.json({ message: 'No valid query provided' });

  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

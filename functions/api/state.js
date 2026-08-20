// GET /api/state
// Alag alag query params ke hisaab se alag data deta hai:
// 1) mobile & password -> login check
// 2) notifications=1 -> notifications ki list
// 3) admin=1 -> admin stats + pending list + sabhi mureeds ki list (drill-down ke liye)
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
          status: user.status,
          is_blocked: user.is_blocked
        }
      });
    }

   // 2) NOTIFICATIONS
    if (notifications) {
      const role = url.searchParams.get('role');
      const userMobile = url.searchParams.get('mobile');

      if (role === 'admin') {
        const notifRes = await db
          .prepare("SELECT * FROM notifications WHERE target_role = 'admin' ORDER BY created_at DESC LIMIT 100")
          .all();
        return Response.json({ notifications: notifRes.results });
      }

      // mureed: sirf apni relevant notifications (target_mobile khaali ho ya unki apni ho)
      const notifRes = await db
        .prepare(
          `SELECT * FROM notifications
           WHERE target_role = 'mureed' AND (target_mobile IS NULL OR target_mobile = ?)
           ORDER BY created_at DESC LIMIT 100`
        )
        .bind(userMobile || '')
        .all();
      return Response.json({ notifications: notifRes.results });
    }

    // 3) ADMIN STATS + PENDING LIST + FULL MUREED LIST
    if (admin) {
      const totalRes = await db.prepare('SELECT COUNT(*) as count FROM mureeds WHERE role = "mureed"').first();
      const mardanaRes = await db.prepare("SELECT COUNT(*) as count FROM mureeds WHERE role = 'mureed' AND group_type = 'mardana'").first();
      const zananaRes = await db.prepare("SELECT COUNT(*) as count FROM mureeds WHERE role = 'mureed' AND group_type = 'zanana'").first();
      const pendingRes = await db.prepare("SELECT * FROM mureeds WHERE status = 'pending' AND password != '' ORDER BY created_at ASC").all();
      const allRes = await db.prepare("SELECT id, name, mobile, group_type, status, is_blocked, last_active, CASE WHEN password = '' THEN 0 ELSE 1 END as has_registered FROM mureeds WHERE role = 'mureed' ORDER BY name ASC").all();

      return Response.json({
        total: totalRes.count,
        mardana: mardanaRes.count,
        zanana: zananaRes.count,
        pending: pendingRes.results,
        all: allRes.results
      });
    }

    // 4) DEFAULT: kuch nahi mila to khaali response
    return Response.json({ message: 'No valid query provided' });

  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

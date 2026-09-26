// functions/api/toggle-global-quran.js
// POST { quran_global_access } -> ek hi switch se SAB mureedon ke liye
// Quran tab ON(1)/OFF(0) karta hai (alarm_settings table ki id=1 row mein)

async function ensureQuranColumn(db) {
  try {
    const info = await db.prepare('PRAGMA table_info(alarm_settings)').all();
    const have = new Set((info.results || []).map(r => r.name));
    if (!have.has('quran_global_access')) {
      await db.prepare(
        "ALTER TABLE alarm_settings ADD COLUMN quran_global_access INTEGER DEFAULT 0"
      ).run();
    }
    return true;
  } catch (e) {
    return false;
  }
}

export async function onRequestPost(context) {
  try {
    const db = context.env.DB;
    const body = await context.request.json();
    const { quran_global_access } = body;

    if (quran_global_access === undefined) {
      return Response.json({ success: false, message: "quran_global_access chahiye" }, { status: 400 });
    }

    await ensureQuranColumn(db);

    await db.prepare(`UPDATE alarm_settings SET quran_global_access = ? WHERE id = 1`)
      .bind(quran_global_access ? 1 : 0)
      .run();

    return Response.json({ success: true, message: "Update ho gaya" });
  } catch (err) {
    return Response.json({ success: false, message: err.message }, { status: 500 });
  }
}

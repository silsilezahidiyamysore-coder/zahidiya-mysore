// POST /api/bulk-add
// Body: { entries: [{ name, mobile, password, group_type }, ...] }
// Ek saath kai mureed add karta hai (turant login kar sakte hain), duplicates aur galat entries skip kar deta hai

export async function onRequestPost(context) {
  const db = context.env.DB;

  try {
    const body = await context.request.json();
    const entries = Array.isArray(body.entries) ? body.entries : [];

    let added = 0, skippedDuplicate = 0, skippedInvalid = 0;

    for (const entry of entries) {
      const name = (entry.name || '').trim();
      const mobile = (entry.mobile || '').trim();
      const password = (entry.password || '').trim();
      const group_type = entry.group_type === 'zanana' ? 'zanana' : 'mardana';

      if (!name || !mobile || !password) {
        skippedInvalid++;
        continue;
      }

      const already = await db
        .prepare('SELECT id FROM mureeds WHERE mobile = ?')
        .bind(mobile)
        .first();

      if (already) {
        skippedDuplicate++;
        continue;
      }

      await db
        .prepare(
          'INSERT INTO mureeds (name, mobile, password, group_type, role, status) VALUES (?, ?, ?, ?, "mureed", "approved")'
        )
        .bind(name, mobile, password, group_type)
        .run();
      added++;
    }

    return Response.json({
      message: `${added} mureed add hue. ${skippedDuplicate} pehle se the, ${skippedInvalid} galat the.`
    });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

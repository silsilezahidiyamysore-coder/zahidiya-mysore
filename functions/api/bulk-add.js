// POST /api/bulk-add
// Body: { entries: [{ name, mobile, group }, ...] }
// Ek saath kai mureed add karta hai, duplicates aur galat entries skip kar deta hai

export async function onRequestPost(context) {
  const db = context.env.DB;

  try {
    const body = await context.request.json();
    const entries = Array.isArray(body.entries) ? body.entries : [];

    let added = 0, skippedDuplicate = 0, skippedInvalid = 0;
    const now = Date.now();

    for (const entry of entries) {
      const name = (entry.name || '').trim();
      const mobile = (entry.mobile || '').trim();
      const group = entry.group === 'Zanana' ? 'Zanana' : 'Mardana';

      if (!name || !mobile || !/^\d{7,15}$/.test(mobile)) {
        skippedInvalid++;
        continue;
      }

      const already = await db
        .prepare('SELECT mobile FROM approved_mureeds WHERE mobile = ?')
        .bind(mobile)
        .first();

      if (already) {
        skippedDuplicate++;
        continue;
      }

      await db
        .prepare('INSERT INTO approved_mureeds (mobile, name, group_name, created_at) VALUES (?, ?, ?, ?)')
        .bind(mobile, name, group, now)
        .run();
      added++;
    }

    return Response.json({ success: true, added, skippedDuplicate, skippedInvalid });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

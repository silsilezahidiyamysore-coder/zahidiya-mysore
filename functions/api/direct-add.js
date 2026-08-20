// POST /api/direct-add
// Body: { name, mobile, password, group_type }
// Admin seedha poora account bana deta hai (password bhi khud set karta hai)
// Mureed turant login kar sakta hai, register karne ki zaroorat nahi.

export async function onRequestPost(context) {
  const db = context.env.DB;

  try {
    const body = await context.request.json();
    const name = (body.name || '').trim();
    const mobile = (body.mobile || '').trim();
    const password = (body.password || '').trim();
    const group_type = body.group_type === 'zanana' ? 'zanana' : 'mardana';

    if (!name || !mobile || !password) {
      return Response.json({ error: 'Naam, mobile aur password zaroori hain' }, { status: 400 });
    }

    const already = await db
      .prepare('SELECT id FROM mureeds WHERE mobile = ?')
      .bind(mobile)
      .first();

    if (already) {
      return Response.json({ error: 'Yeh mobile number pehle se list mein hai' }, { status: 400 });
    }

    await db
      .prepare(
        'INSERT INTO mureeds (name, mobile, password, group_type, role, status) VALUES (?, ?, ?, ?, "mureed", "approved")'
      )
      .bind(name, mobile, password, group_type)
      .run();

    return Response.json({ message: 'Mureed add ho gaya. Ab wo seedha login kar sakta hai.' });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

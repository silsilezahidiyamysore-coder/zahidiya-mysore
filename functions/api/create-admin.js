// POST /api/create-admin
// Body: { name, mobile, password }
// Naya admin account banata hai - wo bhi Admin Panel access kar sakega.

export async function onRequestPost(context) {
  const db = context.env.DB;

  try {
    const body = await context.request.json();
    const name = (body.name || '').trim();
    const mobile = (body.mobile || '').trim();
    const password = (body.password || '').trim();

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
        'INSERT INTO mureeds (name, mobile, password, group_type, role, status) VALUES (?, ?, ?, "mardana", "admin", "approved")'
      )
      .bind(name, mobile, password)
      .run();

    return Response.json({ message: 'Naya admin ban gaya. Wo bhi Admin Panel access kar sakega.' });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

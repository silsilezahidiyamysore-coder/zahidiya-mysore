// POST /api/invite-mureed
// Body: { name, mobile, group_type }
// Admin sirf naam+mobile+group add karta hai (password abhi khaali rehta hai).
// Mureed baad mein Register screen se apna password khud set karega.
// Sirf yahan add kiya hua mobile number hi register ho payega.

export async function onRequestPost(context) {
  const db = context.env.DB;

  try {
    const body = await context.request.json();
    const name = (body.name || '').trim();
    const mobile = (body.mobile || '').trim();
    const group_type = body.group_type === 'zanana' ? 'zanana' : 'mardana';

    if (!name || !mobile) {
      return Response.json({ error: 'Naam aur mobile zaroori hai' }, { status: 400 });
    }

    const existing = await db
      .prepare('SELECT id FROM mureeds WHERE mobile = ?')
      .bind(mobile)
      .first();

    if (existing) {
      return Response.json({ error: 'Yeh mobile number pehle se list mein hai' }, { status: 400 });
    }

    await db
      .prepare(
        'INSERT INTO mureeds (name, mobile, password, group_type, role, status) VALUES (?, ?, ?, ?, "mureed", "pending")'
      )
      .bind(name, mobile, '', group_type)
      .run();

    return Response.json({ message: 'Mureed allow ho gaya. Ab wo Register screen se apna password set karke login kar sakta hai.' });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

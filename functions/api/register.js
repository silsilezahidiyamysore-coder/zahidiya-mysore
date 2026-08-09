export async function onRequestPost(context) {
  const db = context.env.DB;
  try {
    const body = await context.request.json();
    const name = (body.name || '').trim();
    const mobile = (body.mobile || '').trim();
    const password = (body.password || '').trim();
    const group_type = body.group_type === 'zanana' ? 'zanana' : 'mardana';

    if (!name || !mobile || !password) {
      return Response.json({ message: 'Naam, mobile, password zaroori hain' }, { status: 400 });
    }

    const existing = await db.prepare('SELECT id FROM mureeds WHERE mobile = ?').bind(mobile).first();
    if (existing) {
      return Response.json({ message: 'Ye mobile number pehle se registered hai' }, { status: 400 });
    }

    await db.prepare(
      'INSERT INTO mureeds (name, mobile, password, group_type, role, status) VALUES (?, ?, ?, ?, "mureed", "pending")'
    ).bind(name, mobile, password, group_type).run();

    await db.prepare(
      "INSERT INTO notifications (message, target_role) VALUES (?, 'admin')"
    ).bind(`Nayi darkhwast: ${name} (${mobile}) - ${group_type}`).run();

    return Response.json({ message: 'Registered! Wait for admin approval.' });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

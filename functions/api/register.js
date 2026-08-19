export async function onRequestPost(context) {
  const db = context.env.DB;
  try {
    const body = await context.request.json();
    const name = (body.name || '').trim();
    const mobile = (body.mobile || '').trim();
    const password = (body.password || '').trim();

    if (!name || !mobile || !password) {
      return Response.json({ message: 'Naam, mobile, password zaroori hain' }, { status: 400 });
    }

    const existing = await db.prepare('SELECT * FROM mureeds WHERE mobile = ?').bind(mobile).first();

    if (!existing) {
      return Response.json({ message: 'Yeh number admin ki list mein nahi hai. Pehle admin se sampark karein.' }, { status: 400 });
    }

    if (existing.password) {
      return Response.json({ message: 'Ye mobile number pehle se registered hai' }, { status: 400 });
    }

    // Mobile admin ne allow kiya tha aur abhi tak password set nahi hua - registration complete karo
    await db.prepare(
      'UPDATE mureeds SET name = ?, password = ?, status = "approved" WHERE id = ?'
    ).bind(name, password, existing.id).run();

    await db.prepare(
      "INSERT INTO notifications (message, target_role) VALUES (?, 'admin')"
    ).bind(`${name} (${mobile}) ne registration complete kar li hai`).run();

    return Response.json({ message: 'Registration complete! Ab aap login kar sakte hain.' });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

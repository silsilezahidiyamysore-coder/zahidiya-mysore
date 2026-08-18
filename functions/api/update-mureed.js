// POST /api/update-mureed
// Body: { id, name, mobile, password }
// Kisi mureed (ya admin) ka naam, mobile number, ya password badal deta hai.
// Password khaali chhodo to purana password wahi ka wahi rehta hai.

export async function onRequestPost(context) {
  const db = context.env.DB;

  try {
    const body = await context.request.json();
    const id = body.id;
    const name = (body.name || '').trim();
    const mobile = (body.mobile || '').trim();
    const password = (body.password || '').trim();

    if (!id || !name || !mobile) {
      return Response.json({ error: 'Naam aur mobile zaroori hai' }, { status: 400 });
    }

    const existing = await db
      .prepare('SELECT * FROM mureeds WHERE id = ?')
      .bind(id)
      .first();

    if (!existing) {
      return Response.json({ error: 'not_found' }, { status: 404 });
    }

    // Agar naya mobile number kisi doosre mureed ka pehle se hai, to rok do
    const clash = await db
      .prepare('SELECT id FROM mureeds WHERE mobile = ? AND id != ?')
      .bind(mobile, id)
      .first();
    if (clash) {
      return Response.json({ error: 'Yeh mobile number pehle se kisi aur ka hai' }, { status: 400 });
    }

    if (password) {
      await db
        .prepare('UPDATE mureeds SET name = ?, mobile = ?, password = ? WHERE id = ?')
        .bind(name, mobile, password, id)
        .run();
    } else {
      await db
        .prepare('UPDATE mureeds SET name = ?, mobile = ? WHERE id = ?')
        .bind(name, mobile, id)
        .run();
    }

    return Response.json({ message: 'updated' });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

// functions/api/qa-history.js
// GET ?mobile=XXXXXXXXXX -> sirf usi mobile number ke sawal-jawab deta hai

export async function onRequestGet(context) {
  try {
    const db = context.env.DB;
    const url = new URL(context.request.url);
    const mobile = url.searchParams.get('mobile');

    if (!mobile) {
      return Response.json({ success: false, message: "mobile chahiye" }, { status: 400 });
    }

    const { results } = await db.prepare(
      `SELECT id, question, answer, created_at FROM qa_history WHERE mobile = ? ORDER BY created_at DESC`
    ).bind(mobile).all();

    return Response.json({ success: true, history: results });
  } catch (err) {
    return Response.json({ success: false, message: err.message }, { status: 500 });
  }
}

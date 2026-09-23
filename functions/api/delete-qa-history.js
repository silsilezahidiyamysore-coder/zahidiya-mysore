// functions/api/delete-qa-history.js
// POST { id, mobile }              -> sirf usi ek sawal-jawab ko delete karta hai
// POST { mobile, clear_all: true } -> us mobile ke saare sawal-jawab delete karta hai
// mobile hamesha bhejna zaroori hai, taaki koi doosre ka Q&A na delete kar sake.

export async function onRequestPost(context) {
  try {
    const db = context.env.DB;
    const body = await context.request.json();
    const { id, mobile, clear_all } = body;

    if (!mobile) {
      return Response.json({ success: false, message: "mobile chahiye" }, { status: 400 });
    }

    if (clear_all) {
      await db.prepare(`DELETE FROM qa_history WHERE mobile = ?`).bind(mobile).run();
      return Response.json({ success: true, message: "Sara Q&A history delete ho gaya" });
    }

    if (!id) {
      return Response.json({ success: false, message: "id chahiye" }, { status: 400 });
    }

    await db.prepare(`DELETE FROM qa_history WHERE id = ? AND mobile = ?`).bind(id, mobile).run();
    return Response.json({ success: true, message: "Q&A delete ho gaya" });
  } catch (err) {
    return Response.json({ success: false, message: err.message }, { status: 500 });
  }
}

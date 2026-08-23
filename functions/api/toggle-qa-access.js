// functions/api/toggle-qa-access.js
// POST { id, qa_access } -> us mureed ka Sawal-Jawab access ON(1)/OFF(0) karta hai

export async function onRequestPost(context) {
  try {
    const db = context.env.DB;
    const body = await context.request.json();
    const { id, qa_access } = body;

    if (id === undefined || qa_access === undefined) {
      return Response.json({ success: false, message: "id aur qa_access chahiye" }, { status: 400 });
    }

    await db.prepare(`UPDATE mureeds SET qa_access = ? WHERE id = ?`)
      .bind(qa_access ? 1 : 0, id)
      .run();

    return Response.json({ success: true, message: "Sawal-Jawab access update ho gaya" });
  } catch (err) {
    return Response.json({ success: false, message: err.message }, { status: 500 });
  }
}

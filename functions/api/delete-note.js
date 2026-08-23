// functions/api/delete-note.js
// POST { id } -> us note (PDF text) ko hamesha ke liye delete kar deta hai

export async function onRequestPost(context) {
  try {
    const db = context.env.DB;
    const { id } = await context.request.json();

    if (!id) {
      return Response.json({ success: false, message: "id chahiye" }, { status: 400 });
    }

    await db.prepare(`DELETE FROM qa_notes WHERE id = ?`).bind(id).run();
    return Response.json({ success: true, message: "Notes delete ho gayi" });
  } catch (err) {
    return Response.json({ success: false, message: err.message }, { status: 500 });
  }
}

// functions/api/delete-event.js
// POST { id } -> us event ko hamesha ke liye delete kar deta hai

export async function onRequestPost(context) {
  try {
    const db = context.env.DB;
    const body = await context.request.json();
    const { id } = body;

    if (!id) {
      return Response.json({ success: false, message: "id chahiye" }, { status: 400 });
    }

    await db.prepare(`DELETE FROM events WHERE id = ?`).bind(id).run();
    return Response.json({ success: true, message: "Event delete ho gaya" });
  } catch (err) {
    return Response.json({ success: false, message: err.message }, { status: 500 });
  }
}

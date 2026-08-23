// functions/api/toggle-global-qa.js
// POST { qa_global_access } -> ek hi switch se SAB mureedon ke liye
// Sawal-Jawab tab ON(1)/OFF(0) karta hai (alarm_settings table ki id=1 row mein)

export async function onRequestPost(context) {
  try {
    const db = context.env.DB;
    const body = await context.request.json();
    const { qa_global_access } = body;

    if (qa_global_access === undefined) {
      return Response.json({ success: false, message: "qa_global_access chahiye" }, { status: 400 });
    }

    await db.prepare(`UPDATE alarm_settings SET qa_global_access = ? WHERE id = 1`)
      .bind(qa_global_access ? 1 : 0)
      .run();

    return Response.json({ success: true, message: "Update ho gaya" });
  } catch (err) {
    return Response.json({ success: false, message: err.message }, { status: 500 });
  }
}

// functions/api/save-hijri-adjustment.js
// POST { hijri_adjustment_days } -> Islamic calendar ka offset (din) save karta hai

export async function onRequestPost(context) {
  try {
    const db = context.env.DB;
    const body = await context.request.json();
    const days = parseInt(body.hijri_adjustment_days, 10) || 0;

    await db.prepare(`UPDATE alarm_settings SET hijri_adjustment_days = ? WHERE id = 1`)
      .bind(days).run();

    return Response.json({ success: true, message: "Save ho gaya" });
  } catch (err) {
    return Response.json({ success: false, message: err.message }, { status: 500 });
  }
}

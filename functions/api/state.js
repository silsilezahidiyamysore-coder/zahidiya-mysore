// GET /api/state
// Poora data ek saath wapas deta hai — dashboard load hone par yeh call hoti hai

export async function onRequestGet(context) {
  const db = context.env.DB;

  try {
    const classesRes = await db
      .prepare('SELECT * FROM classes ORDER BY created_at DESC')
      .all();

    const approvedRes = await db
      .prepare('SELECT * FROM approved_mureeds ORDER BY created_at ASC')
      .all();

    const pendingRes = await db
      .prepare('SELECT * FROM pending_mureeds ORDER BY created_at ASC')
      .all();

    const notifRes = await db
      .prepare('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 100')
      .all();

    const classes = classesRes.results.map(c => ({
      id: c.id,
      title: c.title,
      date: c.date_label,
      badge: c.badge,
      audioDataUrl: c.audio_data_url,
      videoDataUrl: c.video_data_url,
      videoType: c.video_type,
      pdfDataUrl: c.pdf_data_url
    }));

    const approvedMureeds = approvedRes.results.map(m => ({
      name: m.name,
      mobile: m.mobile,
      group: m.group_name
    }));

    const pendingMureeds = pendingRes.results.map(m => ({
      name: m.name,
      mobile: m.mobile,
      group: m.group_name
    }));

    const notifications = notifRes.results.map(n => ({
      text: n.text,
      time: n.time_label,
      classId: n.class_id,
      forAdminOnly: !!n.for_admin_only,
      isRegistration: !!n.is_registration,
      forMobile: n.for_mobile
    }));

    return Response.json({ classes, approvedMureeds, pendingMureeds, notifications });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

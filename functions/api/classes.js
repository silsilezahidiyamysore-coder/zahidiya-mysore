// POST /api/classes
// Body: { title, audioDataUrl, videoDataUrl, videoType, pdfDataUrl }
// Nayi class database mein save karta hai aur ek notification bhi banata hai

export async function onRequestPost(context) {
  const db = context.env.DB;

  try {
    const body = await context.request.json();
    const title = (body.title || '').trim();
    if (!title) {
      return Response.json({ error: 'Title zaroori hai' }, { status: 400 });
    }

    const id = 'c-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
    const now = Date.now();
    const dateLabel = new Date(now).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

    await db
      .prepare(
        `INSERT INTO classes (id, title, date_label, badge, audio_data_url, video_data_url, video_type, pdf_data_url, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        title,
        dateLabel,
        'Nayi',
        body.audioDataUrl || null,
        body.videoDataUrl || null,
        body.videoType || null,
        body.pdfDataUrl || null,
        now
      )
      .run();

    // Notification bhi bana den taake sab dekh sakein
    const notifText = `Nayi class upload hui: "${title}"` +
      (body.audioDataUrl ? ' (Audio)' : '') +
      (body.videoDataUrl ? ' (Video)' : '') +
      (body.pdfDataUrl ? ' (PDF)' : '');

    await db
      .prepare(
        `INSERT INTO notifications (id, text, time_label, class_id, for_admin_only, is_registration, for_mobile, created_at)
         VALUES (?, ?, ?, ?, 0, 0, NULL, ?)`
      )
      .bind(
        'n-' + Date.now() + '-' + Math.floor(Math.random() * 10000),
        notifText,
        new Date(now).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        id,
        now
      )
      .run();

    return Response.json({ success: true, id });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

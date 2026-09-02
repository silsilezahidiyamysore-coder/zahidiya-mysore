import { sendLiveAlarmPush } from './fcm-helper.js';

// POST /api/toggle-live
// Body: { id, is_live }
// Kisi class ka Live status ON ya OFF karta hai
export async function onRequestPost(context) {
  const db = context.env.DB;
  try {
    const body = await context.request.json();
    const id = body.id;
    const is_live = body.is_live ? 1 : 0;
    if (!id) {
      return Response.json({ error: 'id zaroori hai' }, { status: 400 });
    }
    await db.prepare('UPDATE classes SET is_live = ? WHERE id = ?').bind(is_live, id).run();

    if (is_live) {
      const cls = await db.prepare('SELECT title, group_type FROM classes WHERE id = ?').bind(id).first();
      const notifText = `🔴 LIVE shuru hui: "${cls?.title || ''}"`;
      context.waitUntil(sendLiveAlarmPush(context.env, notifText, cls?.group_type));
    }

    return Response.json({ message: 'ok' });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

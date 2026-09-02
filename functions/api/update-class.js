import { sendLiveAlarmPush } from './fcm-helper.js';

// POST /api/update-class
// Body: { id, title, type, file_url, group_type, is_live }
// Kisi class ka naam, file/link, group, ya live status badal deta hai
// aur mureedon ko notification bhi bhejta hai (click karne par seedha class khul jaaye)
export async function onRequestPost(context) {
  const db = context.env.DB;
  try {
    const body = await context.request.json();
    const id = body.id;
    const title = (body.title || '').trim();
    const group_type = body.group_type;
    const type = body.type;
    const file_url = (body.file_url || '').trim();
    const is_live = body.is_live ? 1 : 0;
    if (!id || !title) {
      return Response.json({ error: 'id aur title zaroori hai' }, { status: 400 });
    }
    if (!['both', 'mardana', 'zanana'].includes(group_type)) {
      return Response.json({ error: 'Group sahi nahi hai' }, { status: 400 });
    }
    if (!['audio', 'video', 'pdf', 'link'].includes(type)) {
      return Response.json({ error: 'Type sahi nahi hai' }, { status: 400 });
    }
    if (!file_url) {
      return Response.json({ error: 'File URL zaroori hai' }, { status: 400 });
    }
    await db
      .prepare('UPDATE classes SET title = ?, type = ?, file_url = ?, group_type = ?, is_live = ? WHERE id = ?')
      .bind(title, type, file_url, group_type, is_live, id)
      .run();
    // Notification bhi banayen taake sab approved mureeds ko pata chale class update hui hai
    const notifText = is_live
      ? `🔴 LIVE shuru hui: "${title}"`
      : `Class update hui: "${title}"`;
    await db
      .prepare(
        `INSERT INTO notifications (message, target_role, is_read, target_mobile, related_class_id)
         VALUES (?, 'mureed', 0, NULL, ?)`
      )
      .bind(notifText, id)
      .run();

    // Live shuru hone par mureedon ke phone par turant loud alarm bhi bajayen (FCM push)
    if (is_live) {
      context.waitUntil(sendLiveAlarmPush(context.env, notifText, group_type));
    }

    return Response.json({ message: 'updated' });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

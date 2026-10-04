export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const { prayer, msg_type, message_ur, message_en } = body;

    const validPrayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    const validTypes = ['start', 'end'];

    if (!validPrayers.includes(prayer)) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid prayer' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' }});
    }
    if (!validTypes.includes(msg_type)) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid type' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' }});
    }

    await env.DB.prepare(
      `UPDATE prayer_messages 
       SET message_ur = ?, message_en = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE prayer = ? AND msg_type = ?`
    ).bind(message_ur || '', message_en || '', prayer, msg_type).run();

    return new Response(JSON.stringify({ success: true, message: 'Saved' }), 
      { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

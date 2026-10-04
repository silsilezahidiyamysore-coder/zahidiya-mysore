export async function onRequestGet({ env }) {
  try {
    const { results } = await env.DB.prepare(
      `SELECT prayer, msg_type, message_ur, message_en 
       FROM prayer_messages 
       ORDER BY 
         CASE prayer 
           WHEN 'Fajr' THEN 1 WHEN 'Dhuhr' THEN 2 WHEN 'Asr' THEN 3 
           WHEN 'Maghrib' THEN 4 WHEN 'Isha' THEN 5 
         END,
         CASE msg_type WHEN 'start' THEN 1 WHEN 'end' THEN 2 END`
    ).all();

    return new Response(JSON.stringify({
      success: true,
      messages: results || []
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60'
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({
      success: false,
      error: e.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

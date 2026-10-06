export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const { prayer, name_ur, name_en } = body;

    const validPrayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    if (!validPrayers.includes(prayer)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid prayer name'
      }), { status: 400, headers: { 'Content-Type': 'application/json' }});
    }

    await env.DB.prepare(
      `UPDATE prayer_names
       SET name_ur = ?, name_en = ?, updated_at = CURRENT_TIMESTAMP
       WHERE prayer = ?`
    ).bind(name_ur || '', name_en || '', prayer).run();

    return new Response(JSON.stringify({
      success: true,
      message: 'Saved'
    }), {
      headers: { 'Content-Type': 'application/json' }
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

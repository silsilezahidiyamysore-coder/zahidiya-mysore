export async function onRequestGet({ env }) {
  try {
    const { results } = await env.DB.prepare(
      `SELECT id, label_ur, label_en, icon, url, sort_order, is_active, open_in
       FROM menu_items
       WHERE is_active = 1
       ORDER BY sort_order ASC, id ASC`
    ).all();
    return new Response(JSON.stringify({
      success: true,
      items: results || []
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

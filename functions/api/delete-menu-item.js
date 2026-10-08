export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const { id } = body;
    if (!id) {
      return new Response(JSON.stringify({
        success: false, error: 'ID required'
      }), { status: 400, headers: { 'Content-Type': 'application/json' }});
    }
    await env.DB.prepare(
      `DELETE FROM menu_items WHERE id = ?`
    ).bind(id).run();
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({
      success: false, error: e.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const { id, label_ur, label_en, icon, url, sort_order, is_active, open_in } = body;

    if (!url || !url.trim()) {
      return new Response(JSON.stringify({
        success: false, error: 'URL is required'
      }), { status: 400, headers: { 'Content-Type': 'application/json' }});
    }

    if (id) {
      // Update existing
      await env.DB.prepare(
        `UPDATE menu_items SET
          label_ur = ?, label_en = ?, icon = ?, url = ?,
          sort_order = ?, is_active = ?, open_in = ?
         WHERE id = ?`
      ).bind(
        label_ur || '', label_en || '', icon || '📌', url,
        sort_order || 0, is_active ? 1 : 0, open_in || 'webview', id
      ).run();
    } else {
      // Insert new
      await env.DB.prepare(
        `INSERT INTO menu_items (label_ur, label_en, icon, url, sort_order, is_active, open_in)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        label_ur || '', label_en || '', icon || '📌', url,
        sort_order || 0, is_active ? 1 : 0, open_in || 'webview'
      ).run();
    }

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

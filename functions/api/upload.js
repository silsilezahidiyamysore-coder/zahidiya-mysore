// POST /api/upload
// FormData mein 'file' bhejo, yeh use R2 mein save karke uska URL wapas deta hai

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return Response.json({ error: 'File nahi mili' }, { status: 400 });
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const key = `${Date.now()}-${safeName}`;

    await env.FILES.put(key, file.stream(), {
      httpMetadata: { contentType: file.type }
    });

    return Response.json({
      key,
      url: `/api/file?key=${encodeURIComponent(key)}`
    });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

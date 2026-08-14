// GET /api/file?key=XXX
// R2 se file wapas bhejta hai (dekhne ke liye ya download ke liye)

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const key = url.searchParams.get('key');
  const download = url.searchParams.get('download');

  if (!key) {
    return new Response('key zaroori hai', { status: 400 });
  }

  const obj = await env.FILES.get(key);
  if (!obj) {
    return new Response('File nahi mili', { status: 404 });
  }

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('etag', obj.httpEtag);

  if (download) {
    const filename = key.split('-').slice(1).join('-') || key;
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);
  }

  return new Response(obj.body, { headers });
}

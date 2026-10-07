export async function onRequestGet({ request }) {
  try {
    const url = new URL(request.url);
    const text = url.searchParams.get('text') || '';

    if (!text.trim()) {
      return new Response(JSON.stringify({ success: false, error: 'No text' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const googleUrl = `https://inputtools.google.com/request?text=${encodeURIComponent(text)}&itc=ur-t-i0-und&num=1&cp=0&cs=1&ie=utf-8&oe=utf-8`;

    const res = await fetch(googleUrl);
    const data = await res.json();

    return new Response(JSON.stringify({ success: true, data: data }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

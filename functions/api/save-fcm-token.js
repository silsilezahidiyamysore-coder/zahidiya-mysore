export async function onRequestPost(context) {
  try {
    const { mobile, token } = await context.request.json();
    if (!mobile || !token) {
      return new Response(JSON.stringify({ success: false, message: 'mobile aur token dono chahiye' }), { status: 400 });
    }
    await context.env.DB.prepare(
      'UPDATE mureeds SET fcm_token = ? WHERE mobile = ?'
    ).bind(token, mobile).run();

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, message: e.message }), { status: 500 });
  }
}

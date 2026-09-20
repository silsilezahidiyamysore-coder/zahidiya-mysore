// functions/api/test-alarm.js  (NAYI file — sirf jaanch ke liye)
// Browser mein kholo:  /api/test-alarm?mobile=APNA_NUMBER
// Ye ussi raaste se phone ko alarm bhejta hai jis raaste se asli Fajr/Zuhr ka
// alarm jaata hai, aur batata hai ki Google (FCM) ne kya jawab diya.
// Jaanch poori hone ke baad is file ko delete kar dena.

function json(obj) {
  return new Response(JSON.stringify(obj, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}

async function getAccessToken(serviceAccountJson) {
  const sa = JSON.parse(serviceAccountJson);
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };
  const enc = (obj) => btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const unsigned = `${enc(header)}.${enc(claim)}`;
  const pemBody = sa.private_key
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  const binaryDer = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    'pkcs8', binaryDer.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']
  );
  const sigBuffer = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sigBuffer)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${unsigned}.${sigB64}`,
  });
  const data = await res.json();
  return data.access_token;
}

async function handle(context) {
  try {
    const url = new URL(context.request.url);
    const mobile = (url.searchParams.get('mobile') || '').trim();
    if (!mobile) return json({ ok: false, message: 'Address ke aakhir mein ?mobile=APNA_NUMBER lagao' });

    const saJson = context.env.FIREBASE_SERVICE_ACCOUNT;
    if (!saJson) return json({ ok: false, message: 'FIREBASE_SERVICE_ACCOUNT Cloudflare mein set nahi hai' });

    const row = await context.env.DB
      .prepare('SELECT fcm_token, is_blocked FROM mureeds WHERE mobile = ?')
      .bind(mobile).first();
    if (!row) return json({ ok: false, message: 'Ye mobile number mureeds mein nahi mila' });
    if (!row.fcm_token) {
      return json({ ok: false, message: 'Is number ka phone-token save nahi hai. Alarm app kholkar Set Alarms dabao, phir dobara try karo.' });
    }

    const sa = JSON.parse(saJson);
    const accessToken = await getAccessToken(saJson);
    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          token: row.fcm_token,
          data: { title: 'Test Alarm', duration: '20', category: 'namaz' },
          android: { priority: 'high' }
        }
      })
    });
    const text = await res.text();
    return json({
      ok: res.ok,
      fcm_status: res.status,
      blocked: !!row.is_blocked,
      fcm_response: text.slice(0, 600),
      message: res.ok
        ? 'Google ne message le liya. Phone par alarm 5-10 second mein bajna chahiye.'
        : 'Google ne message reject kiya — upar fcm_response mein wajah likhi hai.'
    });
  } catch (e) {
    return json({ ok: false, message: 'Error: ' + e.message });
  }
}

export async function onRequestGet(context) { return handle(context); }
export async function onRequestPost(context) { return handle(context); }

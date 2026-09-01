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
    'pkcs8',
    binaryDer.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const sigBuffer = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsigned)
  );
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sigBuffer)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const jwt = `${unsigned}.${sigB64}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const data = await res.json();
  return data.access_token;
}

async function sendToToken(accessToken, projectId, token, title) {
  try {
    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            token,
            data: { title },
            android: { priority: 'high' },
          },
        }),
      }
    );
    return res.ok;
  } catch (e) {
    return false;
  }
}

export async function sendLiveAlarmPush(env, title, groupType) {
  const serviceAccountJson = env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountJson) return;

  let query = 'SELECT fcm_token FROM mureeds WHERE fcm_token IS NOT NULL AND is_blocked = 0';
  const params = [];
  if (groupType && groupType !== 'both') {
    query += ' AND (group_type = ? OR group_type = ?)';
    params.push(groupType, 'both');
  }
  const { results } = await env.DB.prepare(query).bind(...params).all();
  if (!results || results.length === 0) return;

  const accessToken = await getAccessToken(serviceAccountJson);
  const sa = JSON.parse(serviceAccountJson);

  for (const row of results) {
    await sendToToken(accessToken, sa.project_id, row.fcm_token, title);
  }
}

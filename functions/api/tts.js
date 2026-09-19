// functions/api/tts.js  (NAYI file — koi purani file nahi badalti)
// Sawal-Jawab / PDF "Listen in Urdu" ke liye Google Cloud Text-to-Speech se
// saaf URDU awaaz banati hai (pehle Hindi wali awaaz aati thi).
// Zaroori: Cloudflare mein GOOGLE_TTS_API_KEY set honi chahiye.

const VOICES = ['ur-IN-Wavenet-A', 'ur-IN-Standard-A']; // pehli na chale to doosri

function splitText(text, maxBytes) {
  const enc = new TextEncoder();
  const parts = text.split(/(?<=[۔.?!؟\n])\s*/);
  const chunks = [];
  let cur = '';
  for (const p of parts) {
    if (!p) continue;
    const joined = cur ? cur + ' ' + p : p;
    if (enc.encode(joined).length <= maxBytes) {
      cur = joined;
    } else {
      if (cur) chunks.push(cur);
      let rest = p;
      while (enc.encode(rest).length > maxBytes) {
        const cut = Math.floor(maxBytes / 3);
        chunks.push(rest.slice(0, cut));
        rest = rest.slice(cut);
      }
      cur = rest;
    }
  }
  if (cur) chunks.push(cur);
  return chunks;
}

async function synth(text, key) {
  let lastErr = 'unknown';
  for (const name of VOICES) {
    const res = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize?key=' + key, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: 'ur-IN', name },
        audioConfig: { audioEncoding: 'MP3', speakingRate: 0.92 }
      })
    });
    const data = await res.json();
    if (res.ok && data.audioContent) return data.audioContent;
    lastErr = (data.error && data.error.message) || ('status ' + res.status);
  }
  throw new Error(lastErr);
}

function b64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToB64(bytes) {
  let bin = '';
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + step));
  }
  return btoa(bin);
}

export async function onRequestPost(context) {
  try {
    const key = context.env.GOOGLE_TTS_API_KEY;
    if (!key) return Response.json({ success: false, message: 'GOOGLE_TTS_API_KEY set nahi hai' });

    const body = await context.request.json();
    const text = String(body.text || '').trim().slice(0, 12000);
    if (!text) return Response.json({ success: false, message: 'Text khaali hai' });

    // Google ki limit ~5000 bytes hai; Urdu ka har akshar 2 byte hota hai
    const chunks = splitText(text, 4000).slice(0, 6);
    const pieces = [];
    for (const c of chunks) {
      pieces.push(b64ToBytes(await synth(c, key)));
    }
    const total = pieces.reduce((n, p) => n + p.length, 0);
    const all = new Uint8Array(total);
    let off = 0;
    for (const p of pieces) { all.set(p, off); off += p.length; }

    return Response.json({ success: true, audio_base64: bytesToB64(all) });
  } catch (err) {
    return Response.json({ success: false, message: err.message });
  }
}

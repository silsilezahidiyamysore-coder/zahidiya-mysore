// functions/api/tts.js
// Sawal-Jawab / PDF "Listen in Urdu" ke liye ab Google ka naya
// "Gemini 3.1 Flash TTS" (Algieba voice) use hota hai - natural/insaan jaisi
// awaaz, speed control ke saath.
// Zaroori: Cloudflare mein GEMINI_API_KEY set honi chahiye.
// (Agar GEMINI_API_KEY na mile, to purani Google Cloud Wavenet male voice
//  par fallback ho jaata hai, taaki feature kabhi na tootay.)

const GEMINI_MODEL = 'gemini-3.1-flash-tts-preview';
const GEMINI_VOICE = 'Algieba';

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

// Gemini raw PCM (16-bit, 24000Hz, mono) deta hai - usko WAV file mein badalte hain
function pcmToWav(pcmBytes, sampleRate = 24000, channels = 1, bitsPerSample = 16) {
  const byteRate = sampleRate * channels * bitsPerSample / 8;
  const blockAlign = channels * bitsPerSample / 8;
  const buffer = new ArrayBuffer(44 + pcmBytes.length);
  const view = new DataView(buffer);
  const writeStr = (offset, str) => { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)); };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + pcmBytes.length, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeStr(36, 'data');
  view.setUint32(40, pcmBytes.length, true);
  new Uint8Array(buffer, 44).set(pcmBytes);
  return new Uint8Array(buffer);
}

// speed number (0.5 slow - 1.5 fast) ko simple Urdu/English instruction mein badalte hain
function paceInstruction(speed) {
  if (speed <= 0.75) return 'Bahut dheeme, saaf aur thehre hue andaaz mein bolo';
  if (speed <= 0.95) return 'Ek dheeme, saaf aur sukoon bhare andaaz mein bolo';
  if (speed >= 1.25) return 'Thodi tez raftaar mein, lekin saaf aur samajh aane wale andaaz mein bolo';
  return 'Normal, saaf aur natural raftaar mein bolo';
}

async function synthGemini(text, key, speed) {
  const prompt = `${paceInstruction(speed)}. Warm aur welcoming lehje mein, is Urdu text ko bolo:\n\n${text}`;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: GEMINI_VOICE } }
          }
        }
      })
    }
  );
  const data = await res.json();
  const b64 = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!res.ok || !b64) {
    throw new Error((data.error && data.error.message) || 'Gemini TTS failed');
  }
  const pcm = b64ToBytes(b64);
  const wav = pcmToWav(pcm);
  return bytesToB64(wav);
}

// --- Purana Google Cloud TTS (fallback agar GEMINI_API_KEY na ho) ---
const FALLBACK_VOICES = ['ur-IN-Wavenet-B', 'ur-IN-Standard-B'];

async function synthGoogleCloudFallback(text, key, speakingRate) {
  let lastErr = 'unknown';
  for (const name of FALLBACK_VOICES) {
    const res = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize?key=' + key, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: 'ur-IN', name },
        audioConfig: { audioEncoding: 'MP3', speakingRate }
      })
    });
    const data = await res.json();
    if (res.ok && data.audioContent) return data.audioContent;
    lastErr = (data.error && data.error.message) || ('status ' + res.status);
  }
  throw new Error(lastErr);
}

export async function onRequestPost(context) {
  try {
    const geminiKey = context.env.GEMINI_API_KEY;
    const googleTtsKey = context.env.GOOGLE_TTS_API_KEY;

    const body = await context.request.json();
    const text = String(body.text || '').trim().slice(0, 4000);
    if (!text) return Response.json({ success: false, message: 'Text khaali hai' });

    let speed = parseFloat(body.speed);
    if (!speed || isNaN(speed)) speed = 0.9;
    speed = Math.max(0.5, Math.min(1.5, speed));

    if (geminiKey) {
      const audio_base64 = await synthGemini(text, geminiKey, speed);
      return Response.json({ success: true, audio_base64, engine: 'gemini' });
    }

    if (googleTtsKey) {
      const audio_base64 = await synthGoogleCloudFallback(text, googleTtsKey, speed);
      return Response.json({ success: true, audio_base64, engine: 'google-cloud-tts' });
    }

    return Response.json({ success: false, message: 'GEMINI_API_KEY ya GOOGLE_TTS_API_KEY set nahi hai' });
  } catch (err) {
    return Response.json({ success: false, message: err.message });
  }
}

// functions/api/ask-question.js
// POST { question, mobile } -> saari uploaded notes ke text ko context bana kar
// Anthropic AI se jawab poochta hai, aur us mureed/admin ki history mein save karta hai.
//
// ZAROORI: Cloudflare Pages -> Settings -> Environment Variables mein
// ANTHROPIC_API_KEY naam se apni Anthropic API key add karni hai (Secret type mein),
// warna yeh file kaam nahi karegi.

export async function onRequestPost(context) {
  try {
    const db = context.env.DB;
    const body = await context.request.json();
    const { question, mobile } = body;

    if (!question || !question.trim()) {
      return Response.json({ success: false, message: "Sawal likho" }, { status: 400 });
    }

    if (!context.env.ANTHROPIC_API_KEY) {
      return Response.json({ success: false, message: "Admin ne abhi AI key set nahi ki hai (Cloudflare Settings mein ANTHROPIC_API_KEY chahiye)" }, { status: 500 });
    }

    const { results: notes } = await db.prepare(
      `SELECT title, extracted_text FROM qa_notes ORDER BY uploaded_at DESC`
    ).all();

    if (!notes || !notes.length) {
      return Response.json({ success: false, message: "Pehle Admin ko notes (PDF) upload karne do" }, { status: 400 });
    }

    let combinedText = notes.map(n => `--- ${n.title} ---\n${n.extracted_text}`).join('\n\n');
    // Bahut lamba text bhejne se paisa zyada lagta hai, isliye limit rakhte hain
    const MAX_CHARS = 60000;
    if (combinedText.length > MAX_CHARS) combinedText = combinedText.slice(0, MAX_CHARS);

    const systemPrompt =
      "Aap ek madadgar assistant hain jo sirf neeche diye gaye Urdu notes ke andar se sawal ka jawab dete hain. " +
      "Allah ka naam hamesha \u0627\u0644\u0644\u0647 (alif-lam-lam-heh) likho, \u0627\u0644\u0644\u06c1 (do-chashme-heh wala) mat likho. " +
      "Apni taraf se koi nayi baat mat jodo, sirf notes mein jo likha hai wahi bataao. " +
      "Agar jawab notes mein nahi mila, to saaf keh do: \"Yeh jawab in notes mein nahi mila.\" " +
      "Jawab Urdu mein, seedha aur mukhtasar (chhota) do. " +
      "Plain text mein likho — koi markdown mat use karo (# heading, **bold**, bullet - waghera bilkul mat likho). " +
      "Jawab ko sirf normal jude hue jumlon (plain flowing sentences) mein likho — " +
      "bullet points, numbering (1. 2. 3.), asterisk (*), dash (-), ya koi bhi formatting symbol istemal MAT karo, " +
      "kyunki yeh jawab awaaz (text-to-speech) se bhi padha jaata hai aur wo symbols ajeeb tarah se bol diye jaate hain.\n\nNOTES:\n" + combinedText;

    // STREAMING: jawab jaise-jaise AI likhta hai, waise-waise seedha phone/browser
    // tak jaata hai (jaise Claude chat mein hota hai) — isse jawab BADHNA shuru
    // hota hai lagbhag turant, poore jawab ka intezaar nahi karna padta.
    const apiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": context.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 700,
        system: systemPrompt,
        messages: [{ role: "user", content: question }],
        stream: true
      })
    });

    if (!apiRes.ok || !apiRes.body) {
      let msg = "Unknown error";
      try { msg = (await apiRes.json()).error?.message || msg; } catch (e) {}
      return Response.json({ success: false, message: "AI se jawab nahi mila: " + msg }, { status: 500 });
    }

    let fullAnswer = '';
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const reader = apiRes.body.getReader();

    const stream = new ReadableStream({
      async start(controller) {
        let buffer = '';
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop(); // aakhri (adhoori) line agli baar ke liye rakho
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              try {
                const evt = JSON.parse(line.slice(6));
                if (evt.type === 'content_block_delta' && evt.delta?.text) {
                  fullAnswer += evt.delta.text;
                  controller.enqueue(encoder.encode(evt.delta.text));
                }
              } catch (e) { /* ping/heartbeat lines waghera - ignore */ }
            }
          }
        } catch (e) {
          // stream beech mein tooti - jo tak mila wahi save/dikha denge
        } finally {
          controller.close();
          if (fullAnswer.trim()) {
            await db.prepare(
              `INSERT INTO qa_history (mobile, question, answer, created_at) VALUES (?, ?, ?, ?)`
            ).bind(mobile || '', question, fullAnswer.trim(), new Date().toISOString()).run();
          }
        }
      }
    });

    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Qa-Stream': '1' }
    });
  } catch (err) {
    return Response.json({ success: false, message: err.message }, { status: 500 });
  }
}

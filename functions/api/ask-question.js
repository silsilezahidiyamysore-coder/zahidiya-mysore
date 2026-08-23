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
      "Apni taraf se koi nayi baat mat jodo, sirf notes mein jo likha hai wahi bataao. " +
      "Agar jawab notes mein nahi mila, to saaf keh do: \"Yeh jawab in notes mein nahi mila.\" " +
      "Jawab Urdu mein, seedha aur mukhtasar (chhota) do.\n\nNOTES:\n" + combinedText;

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
        messages: [{ role: "user", content: question }]
      })
    });

    const apiData = await apiRes.json();

    if (!apiRes.ok) {
      return Response.json({
        success: false,
        message: "AI se jawab nahi mila: " + (apiData.error?.message || "Unknown error")
      }, { status: 500 });
    }

    const answer = (apiData.content || [])
      .map(c => c.text || '')
      .join('\n')
      .trim() || "Jawab nahi mil saka.";

    await db.prepare(
      `INSERT INTO qa_history (mobile, question, answer, created_at) VALUES (?, ?, ?, ?)`
    ).bind(mobile || '', question, answer, new Date().toISOString()).run();

    return Response.json({ success: true, answer });
  } catch (err) {
    return Response.json({ success: false, message: err.message }, { status: 500 });
  }
}

// functions/api/translate-text.js
// POST { text } -> Anthropic AI se Urdu tarjuma (translation) karta hai.
// Isi ANTHROPIC_API_KEY ka use hota hai jo Sawal-Jawab feature mein pehle se set hai.

export async function onRequestPost(context) {
  try {
    const apiKey = context.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return Response.json(
        { success: false, message: "Admin ne abhi AI key set nahi ki hai." },
        { status: 500 }
      );
    }

    const body = await context.request.json();
    const text = (body.text || "").trim();
    if (!text) {
      return Response.json({ success: false, message: "text chahiye" }, { status: 400 });
    }

    // Bahut lamba text (jaise poori PDF) ek saath na bhejo — chunks mein todo,
    // varna AI response limit se zyada ho jaayega.
    const chunks = [];
    let remaining = text;
    const MAX_CHUNK = 6000;
    while (remaining.length > 0) {
      chunks.push(remaining.slice(0, MAX_CHUNK));
      remaining = remaining.slice(MAX_CHUNK);
    }
    if (chunks.length > 8) chunks.length = 8; // safety limit (bahut badi PDF ho to)

    const translatedParts = [];
    for (const chunk of chunks) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 4000,
          system:
            "Aap ek tarjuma karne wale (translator) hain. Diya hua text Urdu mein tarjuma karo. " +
            "Sirf tarjuma wapas do — koi preamble, koi explanation, koi extra comment mat likho. " +
            "Agar text pehle se Urdu mein hai to wapas wahi de do. " +
            "Allah ka naam hamesha \u0627\u0644\u0644\u0647 (alif-lam-lam-heh) likho, \u0627\u0644\u0644\u06c1 (do-chashme-heh wala) mat likho.",
          messages: [{ role: "user", content: chunk }],
        }),
      });
      const data = await res.json();
      const translated = data.content?.[0]?.text || "";
      if (!translated) {
        return Response.json(
          { success: false, message: "Tarjuma karne mein error aayi" },
          { status: 500 }
        );
      }
      translatedParts.push(translated.trim());
    }

    return Response.json({ success: true, translated: translatedParts.join("\n\n") });
  } catch (err) {
    return Response.json({ success: false, message: String(err) }, { status: 500 });
  }
}

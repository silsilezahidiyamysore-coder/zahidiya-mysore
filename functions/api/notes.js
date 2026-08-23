// functions/api/notes.js
// GET  -> saari uploaded notes (Urdu PDF text) ki list deta hai
// POST -> nayi notes save karta hai (title + extracted text)

export async function onRequestGet(context) {
  try {
    const db = context.env.DB;
    const { results } = await db.prepare(
      `SELECT id, title, file_url, uploaded_at FROM qa_notes ORDER BY uploaded_at DESC`
    ).all();
    return Response.json({ success: true, notes: results });
  } catch (err) {
    return Response.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function onRequestPost(context) {
  try {
    const db = context.env.DB;
    const body = await context.request.json();
    const { title, file_url, extracted_text } = body;

    if (!title || !extracted_text) {
      return Response.json({ success: false, message: "Title aur PDF ka text zaroori hai" }, { status: 400 });
    }

    await db.prepare(
      `INSERT INTO qa_notes (title, file_url, extracted_text, uploaded_at) VALUES (?, ?, ?, ?)`
    ).bind(title, file_url || '', extracted_text, new Date().toISOString()).run();

    return Response.json({ success: true, message: "Notes save ho gayi" });
  } catch (err) {
    return Response.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const mobile = url.searchParams.get("mobile");

  if (!mobile) {
    return new Response(JSON.stringify({ error: "Mobile number required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const result = await env.DB.prepare(
    "SELECT name, group_type FROM mureeds WHERE mobile = ?"
  )
    .bind(mobile)
    .first();

  if (!result) {
    return new Response(
      JSON.stringify({ registered: false, message: "Yeh number registered nahi hai." }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({
      registered: true,
      name: result.name,
      group_type: result.group_type,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

const corsHeaders = (request) => {
  const origin = request.headers.get("Origin") || "*";

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
};

const corsResponse = (request, body = null, status = 204) =>
  new Response(body, {
    status,
    headers: corsHeaders(request),
  });

export const loader = async ({ request }) => {
  if (request.method === "OPTIONS") {
    return corsResponse(request);
  }

  return corsResponse(request, JSON.stringify({ ok: true }), 200);
};

export const action = async ({ request }) => {
  if (request.method === "OPTIONS") {
    return corsResponse(request);
  }

  let payload = {};
  try {
    const raw = await request.text();
    payload = raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.error("===== WEB PIXEL ===== invalid JSON", error);
    return corsResponse(request, JSON.stringify({ ok: false }), 400);
  }

  console.log("===== WEB PIXEL =====");
  console.log("Step:", payload.step);
  console.log("QR:", payload.qrHandle);
  console.log("Event:", payload.name);
  console.log("URL:", payload.href);
  console.log("Client ID:", payload.clientId);
  console.log("Payload:", payload);
  console.log("=====================");

  return corsResponse(request, JSON.stringify({ ok: true }), 200);
};

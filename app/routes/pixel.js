import { recordFunnelEvent } from "../models/qrFunnel.server";

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

const shopFromRequest = (payload, request) => {
  if (payload.shop) return payload.shop;

  const origin = request.headers.get("Origin");
  if (!origin) return "";

  try {
    const host = new URL(origin).hostname;
    return host.endsWith(".myshopify.com") ? host : "";
  } catch {
    return "";
  }
};

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

  try {
    await recordFunnelEvent({
      shop: shopFromRequest(payload, request),
      qrHandle: payload.qrHandle,
      step: payload.step,
      clientId: payload.clientId,
      eventId: payload.id,
      href: payload.href,
    });
  } catch (error) {
    console.error("===== WEB PIXEL ===== failed to save", error);
  }

  console.log("===== WEB PIXEL =====");
  console.log("Step:", payload.step);
  console.log("QR:", payload.qrHandle);
  console.log("Event:", payload.name);
  console.log("URL:", payload.href);
  console.log("Client ID:", payload.clientId);
  console.log("=====================");

  return corsResponse(request, JSON.stringify({ ok: true }), 200);
};

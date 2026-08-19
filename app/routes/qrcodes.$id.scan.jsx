import { redirect } from "react-router";

import { authenticate } from "../shopify.server";
import {
  getQRCode,
  getDestinationUrl,
  incrementQRCodeScans,
} from "../models/QRCode.server";
import { ensureWebPixelEndpoint } from "../models/webPixel.server";

export const loader = async ({ request, params }) => {
  if (!params.id) {
    throw new Response("QR code not found", { status: 404 });
  }

  const { admin, session } = await authenticate.public.appProxy(request);
  if (!admin || !session) {
    throw new Response("App not installed on shop", { status: 401 });
  }

  const shop = session.shop;
  const qrCode = await getQRCode(params.id, admin.graphql, shop);
  if (!qrCode) {
    throw new Response("QR code not found", { status: 404 });
  }

  await incrementQRCodeScans(qrCode.id, qrCode.scans, admin.graphql);

  try {
    await ensureWebPixelEndpoint(admin.graphql, process.env.SHOPIFY_APP_URL);
  } catch (error) {
    console.error("[web pixel] failed to sync endpoint on scan", error);
  }

  return redirect(getDestinationUrl(qrCode, shop));
};

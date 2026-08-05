import { redirect } from "react-router";

import { unauthenticated } from "../shopify.server";
import {
  getQRCode,
  getDestinationUrl,
  incrementQRCodeScans,
} from "../models/QRCode.server";

export const loader = async ({ request, params }) => {
  if (!params.id) {
    throw new Response("QR code not found", { status: 404 });
  }

  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  if (!shop) {
    throw new Response("Missing shop parameter", { status: 400 });
  }

  const { admin } = await unauthenticated.admin(shop);
  const qrCode = await getQRCode(params.id, admin.graphql, shop);
  if (!qrCode) {
    throw new Response("QR code not found", { status: 404 });
  }

  await incrementQRCodeScans(qrCode.id, qrCode.scans, admin.graphql);

  return redirect(getDestinationUrl(qrCode, shop));
};

import { authenticate } from "../shopify.server";
import { getQRCode, getQRCodePngBuffer } from "../models/QRCode.server";

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

  const png = await getQRCodePngBuffer(params.id, shop);

  return new Response(png, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600",
    },
  });
};

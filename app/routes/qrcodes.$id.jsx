import { useLoaderData } from "react-router";

import { unauthenticated } from "../shopify.server";
import { getQRCode } from "../models/QRCode.server";

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

  return {
    title: qrCode.title,
    image: qrCode.image,
  };
};

export default function QRCode() {
  const { image, title } = useLoaderData();

  return (
    <>
      <h1>{title}</h1>
      <img src={image} alt={`QR Code for product`} />
    </>
  );
}

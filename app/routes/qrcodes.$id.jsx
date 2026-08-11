import { useLoaderData } from "react-router";

import { authenticate } from "../shopify.server";
import { getQRCode } from "../models/QRCode.server";

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

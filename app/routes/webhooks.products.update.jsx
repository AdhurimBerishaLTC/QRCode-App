import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  const { payload, topic, shop } = await authenticate.webhook(request);

  console.log("===== PRODUCT WEBHOOK =====");
  console.log("Topic:", topic);
  console.log("Shop:", shop);
  console.log("Payload:", payload);

  return new Response("OK", { status: 200 });
};

/**
 * Pull-subscription worker for Shopify orders/create webhooks via Google Pub/Sub.
 * Based on: https://cloud.google.com/nodejs/docs/reference/pubsub/latest
 *
 * Prerequisites:
 * 1. GCP topic + pull subscription created
 * 2. Shopify publisher principal granted Pub/Sub Publisher on the topic
 * 3. Application Default Credentials configured (gcloud auth application-default login)
 *    or GOOGLE_APPLICATION_CREDENTIALS pointing at a service account key
 *
 * Env (loaded from .env via `npm run pubsub:orders-create`):
 *   GOOGLE_CLOUD_PROJECT            — GCP project ID
 *   PUBSUB_SUBSCRIPTION             — pull subscription ID (required)
 *   GOOGLE_APPLICATION_CREDENTIALS  — path to service account JSON key
 */

import { PubSub } from "@google-cloud/pubsub";

const subscriptionNameOrId = process.env.PUBSUB_SUBSCRIPTION;
const projectId = process.env.GOOGLE_CLOUD_PROJECT;

if (!subscriptionNameOrId) {
  console.error(
    "Set PUBSUB_SUBSCRIPTION to your GCP pull subscription ID before running.",
  );
  process.exit(1);
}

const pubSubClient = new PubSub(
  projectId ? { projectId } : undefined,
);

const subscription = pubSubClient.subscription(subscriptionNameOrId);

function processOrderCreate(payload, attributes) {
  const shop = attributes["X-Shopify-Shop-Domain"] ?? attributes.shop_domain;
  const topic = attributes["X-Shopify-Topic"] ?? attributes.topic;
  const lineItems = (payload?.line_items ?? []).map((item) => ({
    id: item.id,
    title: item.title,
    quantity: item.quantity,
    sku: item.sku,
    price: item.price,
    variant_id: item.variant_id,
    product_id: item.product_id,
  }));

  console.log("--- orders/create ---");
  console.log(
    JSON.stringify(
      {
        topic: topic ?? "orders/create",
        shop: shop ?? null,
        webhookId: attributes["X-Shopify-Webhook-Id"] ?? null,
        eventId: attributes["X-Shopify-Event-Id"] ?? null,
        apiVersion: attributes["X-Shopify-API-Version"] ?? null,
        isTest: attributes["X-Shopify-Test"] === "true",
        triggeredAt: attributes["X-Shopify-Triggered-At"] ?? null,
        order: {
          id: payload?.id ?? null,
          name: payload?.name ?? null,
          email: payload?.email ?? null,
          created_at: payload?.created_at ?? null,
          currency: payload?.currency ?? null,
          total_price: payload?.total_price ?? null,
          financial_status: payload?.financial_status ?? null,
          fulfillment_status: payload?.fulfillment_status ?? null,
          customer: payload?.customer
            ? {
                id: payload.customer.id,
                email: payload.customer.email,
                first_name: payload.customer.first_name,
                last_name: payload.customer.last_name,
              }
            : null,
          line_items: lineItems,
        },
        payload,
      },
      null,
      2,
    ),
  );
  console.log("---------------------");

  // Add your warranty / order business logic here.
}

const messageHandler = (message) => {
  try {
    const data = message.data.toString("utf8");
    const payload = JSON.parse(data);

    console.log(`Received Pub/Sub message ${message.id}`);
    processOrderCreate(payload, message.attributes ?? {});
    message.ack();
  } catch (error) {
    console.error(`Failed to process message ${message.id}:`, error);
    message.nack();
  }
};

subscription.on("message", messageHandler);
subscription.on("error", (error) => {
  console.error("Pub/Sub subscription error:", error);
});

console.log(
  `Listening for Shopify orders/create on subscription "${subscriptionNameOrId}"…`,
);

const shutdown = () => {
  console.log("Stopping Pub/Sub listener…");
  subscription.removeListener("message", messageHandler);
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

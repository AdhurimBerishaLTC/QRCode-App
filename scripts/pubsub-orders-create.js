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
 *   DATABASE_URL                    — Prisma DB with Session table (optional; defaults via schema)
 */

import { PubSub } from "@google-cloud/pubsub";
import { PrismaClient } from "@prisma/client";

const subscriptionNameOrId = process.env.PUBSUB_SUBSCRIPTION;
const projectId = process.env.GOOGLE_CLOUD_PROJECT;
const apiVersion = process.env.SHOPIFY_API_VERSION || "2026-07";

if (!subscriptionNameOrId) {
  console.error(
    "Set PUBSUB_SUBSCRIPTION to your GCP pull subscription ID before running.",
  );
  process.exit(1);
}

const prisma = new PrismaClient();
const pubSubClient = new PubSub(projectId ? { projectId } : undefined);
const subscription = pubSubClient.subscription(subscriptionNameOrId);

function hasQrDiscountTitle(payload) {
  return (payload?.discount_applications ?? []).some((application) => {
    const title = String(application?.title ?? "").toLowerCase();
    return title.includes("qr scan") || title.includes("scan qr");
  });
}

function hasQrSrcNoteAttribute(payload) {
  return (payload?.note_attributes ?? []).some(
    (attribute) =>
      String(attribute?.name ?? "").toLowerCase() === "src" &&
      String(attribute?.value ?? "").toLowerCase() === "qr",
  );
}

function hasQrSrcLineProperty(payload) {
  return (payload?.line_items ?? []).some((item) =>
    (item?.properties ?? []).some(
      (property) =>
        String(property?.name ?? "").toLowerCase() === "src" &&
        String(property?.value ?? "").toLowerCase() === "qr",
    ),
  );
}

function hasQrDiscount(payload) {
  return (
    hasQrDiscountTitle(payload) ||
    hasQrSrcNoteAttribute(payload) ||
    hasQrSrcLineProperty(payload)
  );
}

function getCustomerGid(payload) {
  if (payload?.customer?.admin_graphql_api_id) {
    return payload.customer.admin_graphql_api_id;
  }

  if (payload?.customer?.id) {
    return `gid://shopify/Customer/${payload.customer.id}`;
  }

  return null;
}

async function getOfflineAccessToken(shop) {
  const session =
    (await prisma.session.findUnique({
      where: { id: `offline_${shop}` },
    })) ??
    (await prisma.session.findFirst({
      where: {
        shop,
        isOnline: false,
      },
      orderBy: {
        id: "desc",
      },
    }));

  if (!session?.accessToken) {
    throw new Error(`No offline session found for shop ${shop}`);
  }

  return session.accessToken;
}

async function markQrDiscountRedeemed(shop, customerId) {
  const accessToken = await getOfflineAccessToken(shop);
  const response = await fetch(
    `https://${shop}/admin/api/${apiVersion}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({
        query: `#graphql
          mutation MarkQrDiscountRedeemed($metafields: [MetafieldsSetInput!]!) {
            metafieldsSet(metafields: $metafields) {
              metafields {
                key
                value
              }
              userErrors {
                field
                message
              }
            }
          }`,
        variables: {
          metafields: [
            {
              ownerId: customerId,
              namespace: "$app",
              key: "qr_discount_redeemed",
              type: "boolean",
              value: "true",
            },
          ],
        },
      }),
    },
  );

  const responseJson = await response.json();
  const errors = responseJson.data?.metafieldsSet?.userErrors ?? [];
  if (!response.ok || responseJson.errors?.length || errors.length) {
    throw new Error(
      `Failed to mark QR redemption: ${JSON.stringify({
        status: response.status,
        errors: responseJson.errors ?? errors,
      })}`,
    );
  }
}

async function processOrderCreate(payload, attributes) {
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

  if (!shop || !hasQrDiscount(payload)) {
    return;
  }

  const customerId = getCustomerGid(payload);
  if (!customerId) {
    console.log("Skipping QR redemption: order has no customer.");
    return;
  }

  await markQrDiscountRedeemed(shop, customerId);
  console.log(`Marked QR discount redeemed for ${customerId}.`);
}

const messageHandler = async (message) => {
  try {
    const data = message.data.toString("utf8");
    const payload = JSON.parse(data);

    console.log(`Received Pub/Sub message ${message.id}`);
    await processOrderCreate(payload, message.attributes ?? {});
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

const shutdown = async () => {
  console.log("Stopping Pub/Sub listener…");
  subscription.removeListener("message", messageHandler);
  await prisma.$disconnect();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

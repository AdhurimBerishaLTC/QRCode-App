import qrcode from "qrcode";
import invariant from "tiny-invariant";

const METAOBJECT_TYPE = "$app:product_qr";

async function findQrCodeDefinition(graphql) {
  const byType = await graphql(
    `
      query GetQrCodeDefinition($type: String!) {
        metaobjectDefinitionByType(type: $type) {
          id
          type
        }
      }
    `,
    { variables: { type: METAOBJECT_TYPE } },
  );
  const byTypeJson = await byType.json();
  if (byTypeJson.data?.metaobjectDefinitionByType?.id) {
    return byTypeJson.data.metaobjectDefinitionByType;
  }

  const listed = await graphql(
    `
      query ListMetaobjectDefinitions {
        metaobjectDefinitions(first: 50) {
          nodes {
            id
            type
            name
          }
        }
      }
    `,
  );
  const listedJson = await listed.json();
  const nodes = listedJson.data?.metaobjectDefinitions?.nodes ?? [];
  return (
    nodes.find(
      (node) =>
        node.type === METAOBJECT_TYPE || node.type?.endsWith("--product_qr"),
    ) ?? null
  );
}

async function ensureQrCodeDefinition(graphql) {
  if (await findQrCodeDefinition(graphql)) {
    return;
  }

  const created = await graphql(
    `
      mutation CreateQrCodeDefinition(
        $definition: MetaobjectDefinitionCreateInput!
      ) {
        metaobjectDefinitionCreate(definition: $definition) {
          metaobjectDefinition {
            id
            type
          }
          userErrors {
            field
            message
            code
          }
        }
      }
    `,
    {
      variables: {
        definition: {
          name: "QR Code",
          description: "QR codes that link to products",
          type: METAOBJECT_TYPE,
          access: {
            admin: "MERCHANT_READ_WRITE",
            storefront: "PUBLIC_READ",
          },
          fieldDefinitions: [
            {
              key: "title",
              name: "Title",
              type: "single_line_text_field",
              required: true,
            },
            {
              key: "product",
              name: "Product",
              type: "product_reference",
            },
            {
              key: "product_variant",
              name: "Product Variant",
              type: "variant_reference",
            },
            {
              key: "destination",
              name: "Destination",
              type: "single_line_text_field",
            },
            {
              key: "scans",
              name: "Scans",
              type: "number_integer",
            },
          ],
        },
      },
    },
  );
  const createdJson = await created.json();
  const payload = createdJson.data?.metaobjectDefinitionCreate;
  const errors = payload?.userErrors ?? [];
  if (errors.length) {
    if (await findQrCodeDefinition(graphql)) {
      return;
    }
    throw new Error(errors[0].message);
  }
}

export async function getQRCode(handle, graphql, shop) {
  const response = await graphql(
    `
      query GetQRCode($handle: MetaobjectHandleInput!) {
        metaobjectByHandle(handle: $handle) {
          id
          handle
          updatedAt
          title: field(key: "title") {
            jsonValue
          }
          product: field(key: "product") {
            jsonValue
            reference {
              ... on Product {
                handle
                title
                onlineStoreUrl
                media(first: 1) {
                  nodes {
                    preview {
                      image {
                        url
                        altText
                      }
                    }
                  }
                }
              }
            }
          }
          productVariant: field(key: "product_variant") {
            jsonValue
            reference {
              ... on ProductVariant {
                id
                legacyResourceId
              }
            }
          }
          destination: field(key: "destination") {
            jsonValue
            value
          }
          scans: field(key: "scans") {
            jsonValue
          }
        }
      }
    `,
    {
      variables: {
        handle: { type: METAOBJECT_TYPE, handle },
      },
    },
  );
  const { data } = await response.json();
  const metaobject = data?.metaobjectByHandle;

  if (!metaobject) {
    return null;
  }
  return transformMetaobject(metaobject, shop);
}

export async function getQRCodes(graphql, shop) {
  const response = await graphql(
    `
      query GetQRCodes($type: String!) {
        metaobjects(
          type: $type
          first: 50
          sortKey: "updated_at"
          reverse: true
        ) {
          nodes {
            id
            handle
            updatedAt
            title: field(key: "title") {
              jsonValue
            }
            product: field(key: "product") {
              jsonValue
              reference {
                ... on Product {
                  handle
                  title
                  onlineStoreUrl
                  media(first: 1) {
                    nodes {
                      preview {
                        image {
                          url
                          altText
                        }
                      }
                    }
                  }
                }
              }
            }
            productVariant: field(key: "product_variant") {
              jsonValue
              reference {
                ... on ProductVariant {
                  id
                  legacyResourceId
                }
              }
            }
            destination: field(key: "destination") {
              jsonValue
              value
            }
            scans: field(key: "scans") {
              jsonValue
            }
          }
        }
      }
    `,
    {
      variables: {
        type: METAOBJECT_TYPE,
      },
    },
  );

  const { data } = await response.json();
  const metaobjects = data?.metaobjects?.nodes ?? [];

  return Promise.all(metaobjects.map((mo) => transformMetaobject(mo, shop)));
}

async function transformMetaobject(metaobject, shop) {
  const product = metaobject.product?.reference;
  const variant = metaobject.productVariant?.reference;
  const productId = metaobject.product?.jsonValue;
  const productVariantId =
    variant?.id ?? metaobject.productVariant?.jsonValue ?? null;

  const qrCode = {
    id: metaobject.id,
    handle: metaobject.handle,
    title: metaobject.title?.jsonValue,
    productId,
    productVariantId,
    productHandle: product?.handle,
    productVariantLegacyId: getVariantLegacyId({
      productVariantLegacyId: variant?.legacyResourceId,
      productVariantId,
    }),
    onlineStoreUrl: product?.onlineStoreUrl ?? null,
    destination:
      metaobject.destination?.jsonValue ?? metaobject.destination?.value,
    scans: metaobject.scans?.jsonValue ?? 0,
    createdAt: metaobject.updatedAt,
    productDeleted: Boolean(productId && !product),
    productTitle: product?.title,
    productImage: product?.media?.nodes[0]?.preview?.image?.url,
    productAlt: product?.media?.nodes[0]?.preview?.image?.altText,
  };

  qrCode.destinationUrl = getDestinationUrl(qrCode, shop);
  qrCode.image = await getQRCodeImage(metaobject.handle, shop);

  return qrCode;
}

export async function getQRCodeImage(handle, shop) {
  const url = getQRCodeScanUrl(handle, shop);
  return qrcode.toDataURL(url.href);
}

export async function getQRCodePngBuffer(handle, shop) {
  const url = getQRCodeScanUrl(handle, shop);
  return qrcode.toBuffer(url.href, {
    type: "png",
    width: 420,
    margin: 1,
    color: {
      dark: "#111111",
      light: "#ffffff",
    },
  });
}

/**
 * Storefront app-proxy URL so scans stay on the shop domain
 * (`/apps/qrcodes/...` → app `/qrcodes/...` via [app_proxy] in shopify.app.toml).
 */
export function getQRCodePublicUrl(handle, shop, path = "") {
  const suffix = path ? `/${path.replace(/^\//, "")}` : "";
  return new URL(`/apps/qrcodes/${handle}${suffix}`, `https://${shop}`);
}

function getQRCodeScanUrl(handle, shop) {
  return getQRCodePublicUrl(handle, shop, "scan");
}

function getVariantLegacyId(qrCode) {
  if (qrCode.productVariantLegacyId != null && qrCode.productVariantLegacyId !== "") {
    return String(qrCode.productVariantLegacyId);
  }

  if (qrCode.productVariantId) {
    const match = /ProductVariant\/(\d+)/.exec(String(qrCode.productVariantId));
    if (match) return match[1];
  }

  return null;
}

function applyQrAttribution(url, handle) {
  url.searchParams.set("src", "qr");
  if (handle) {
    url.searchParams.set("qr", handle);
  }
  return url.toString();
}

export function getDestinationUrl(qrCode, shop) {
  const variantId = getVariantLegacyId(qrCode);

  if (qrCode.destination === "product") {
    if (qrCode.onlineStoreUrl) {
      const url = new URL(qrCode.onlineStoreUrl);
      if (variantId) {
        url.searchParams.set("variant", variantId);
      }
      return applyQrAttribution(url, qrCode.handle);
    }

    invariant(qrCode.productHandle, "Product handle is missing");
    const url = new URL(`https://${shop}/products/${qrCode.productHandle}`);
    if (variantId) {
      url.searchParams.set("variant", variantId);
    }
    return applyQrAttribution(url, qrCode.handle);
  }

  invariant(variantId, "Unrecognized product variant ID");
  const cartUrl = new URL(`https://${shop}/cart/${variantId}:1`);
  return applyQrAttribution(cartUrl, qrCode.handle);
}

export async function saveQRCode(handle, data, graphql) {
  await ensureQrCodeDefinition(graphql);

  const response = await graphql(
    `
      mutation UpsertQRCode(
        $handle: MetaobjectHandleInput!
        $metaobject: MetaobjectUpsertInput!
      ) {
        metaobjectUpsert(handle: $handle, metaobject: $metaobject) {
          metaobject {
            id
            handle
          }
          userErrors {
            field
            message
          }
        }
      }
    `,
    {
      variables: {
        handle: { type: METAOBJECT_TYPE, handle },
        metaobject: {
          fields: [
            { key: "title", value: data.title },
            { key: "product", value: data.productId },
            { key: "product_variant", value: data.productVariantId },
            { key: "destination", value: data.destination },
          ],
        },
      },
    },
  );
  const { data: responseData } = await response.json();
  const { metaobjectUpsert } = responseData;

  if (metaobjectUpsert.userErrors.length) {
    throw new Error(metaobjectUpsert.userErrors[0].message);
  }
  return metaobjectUpsert.metaobject;
}

export async function deleteQRCode(id, graphql) {
  const response = await graphql(
    `
      mutation DeleteQRCode($id: ID!) {
        metaobjectDelete(id: $id) {
          deletedId
          userErrors {
            field
            message
          }
        }
      }
    `,
    {
      variables: {
        id,
      },
    },
  );
  const { data } = await response.json();

  if (data.metaobjectDelete.userErrors.length) {
    throw new Error(data.metaobjectDelete.userErrors[0].message);
  }
}

export async function incrementQRCodeScans(id, currentScans, graphql) {
  await graphql(
    `
      mutation IncrementScans($id: ID!, $metaobject: MetaobjectUpdateInput!) {
        metaobjectUpdate(id: $id, metaobject: $metaobject) {
          metaobject {
            id
          }
          userErrors {
            field
            message
          }
        }
      }
    `,
    {
      variables: {
        id,
        metaobject: {
          fields: [{ key: "scans", value: String(currentScans + 1) }],
        },
      },
    },
  );
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function generateHandle(title) {
  return `${slugify(title)}-${Date.now().toString(36)}`;
}

export function validateQRCode(data) {
  const errors = {};

  if (!data.title) {
    errors.title = "Title is required";
  }

  if (!data.productId) {
    errors.productId = "Product is required";
  }

  if (!data.destination) {
    errors.destination = "Destination is required";
  }

  if (Object.keys(errors).length) {
    return errors;
  }
}

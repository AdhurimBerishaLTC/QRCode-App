const METAOBJECT_TYPE = "$app:product_qr";

/**
 * @typedef {{
 *   data?: {
 *     metaobjectByHandle?: {
 *       handle: string
 *       title?: { jsonValue?: string | null }
 *       product?: { reference?: { title?: string } | null }
 *       productVariant?: {
 *         reference?: {
 *           id?: string
 *           legacyResourceId?: string | number
 *           title?: string
 *           price?: string
 *           image?: { url?: string } | null
 *           product?: { featuredImage?: { url?: string } | null } | null
 *         } | null
 *       }
 *     } | null
 *   }
 * }} QrCodeResponse
 */

/**
 * @param {string} handle
 * @returns {Promise<QrCodeResponse>}
 */
export async function fetchQrCode(handle) {
  const response = await fetch("shopify:admin/api/graphql.json", {
    method: "POST",
    body: JSON.stringify({
      query: `#graphql
        query GetQrCode($handle: MetaobjectHandleInput!) {
          metaobjectByHandle(handle: $handle) {
            handle
            title: field(key: "title") { jsonValue }
            product: field(key: "product") {
              reference {
                ... on Product { title }
              }
            }
            productVariant: field(key: "product_variant") {
              reference {
                ... on ProductVariant {
                  id
                  legacyResourceId
                  title
                  price
                  image {
                    url
                  }
                  product {
                    featuredImage {
                      url
                    }
                  }
                }
              }
            }
          }
        }
      `,
      variables: { handle: { type: METAOBJECT_TYPE, handle } },
    }),
  });

  return /** @type {Promise<QrCodeResponse>} */ (response.json());
}

/**
 * @param {unknown} scanned
 * @returns {string | null}
 */
export function parseQrHandle(scanned) {
  const text = String(scanned ?? "").trim();
  try {
    const url = new URL(text);
    const match = url.pathname.match(/\/apps\/qrcodes\/([^/]+)/);
    if (match?.[1]) {
      return match[1];
    }
  } catch {
    // scanned value was not a URL
  }
  return null;
}

/**
 * @param {string | number | null | undefined} gid
 * @returns {number | null}
 */
export function variantNumericId(gid) {
  const match = /ProductVariant\/(\d+)/.exec(String(gid ?? ""));
  return match ? Number(match[1]) : null;
}

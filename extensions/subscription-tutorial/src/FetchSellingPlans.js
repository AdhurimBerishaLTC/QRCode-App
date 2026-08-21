/**
 * @typedef {{ id: string, name: string, category?: string }} SellingPlan
 * @typedef {{ name: string, sellingPlans: { nodes: SellingPlan[] } }} SellingPlanGroup
 * @typedef {{
 *   data?: {
 *     productVariant?: {
 *       sellingPlanGroups: { nodes: SellingPlanGroup[] }
 *     } | null
 *   }
 * }} SellingPlansResponse
 */

/**
 * @param {number | string} variantId
 * @returns {Promise<SellingPlansResponse>}
 */
export async function fetchSellingPlans(variantId) {
  const requestBody = {
    query: `#graphql
          query GetSellingPlans($variantId: ID!) {
            productVariant(id: $variantId) {
              sellingPlanGroups(first: 10) {
                nodes {
                  name
                  sellingPlans(first: 10) {
                    nodes {
                      id
                      name
                      category
                    }
                  }
                }
              }
            }
          }
        `,
    variables: { variantId: `gid://shopify/ProductVariant/${variantId}` },
  };

  const res = await fetch("shopify:admin/api/graphql.json", {
    method: "POST",
    body: JSON.stringify(requestBody),
  });

  return /** @type {Promise<SellingPlansResponse>} */ (res.json());
}

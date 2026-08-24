/**
 * @typedef {{
 *   id: number
 *   title: string
 *   description: string
 *   completed: boolean
 * }} Issue
 *
 * @typedef {{
 *   data?: {
 *     product?: {
 *       metafield?: { value?: string | null } | null
 *     } | null
 *   } | null
 * }} ProductIssuesResponse
 */

/**
 * @param {string} id
 * @param {Issue[]} newIssues
 */
export async function updateIssues(id, newIssues) {
  // This example uses metafields to store the data. For more information, refer to https://shopify.dev/docs/apps/custom-data/metafields.
  return await makeGraphQLQuery(
    `mutation SetMetafield($ownerId: ID!, $namespace: String!, $key: String!, $type: String!, $value: String!) {
        metafieldsSet(metafields: [{ownerId: $ownerId, namespace: $namespace, key: $key, type: $type, value: $value}]) {
          metafields {
            id
            namespace
            key
            jsonValue
          }
          userErrors {
            field
            message
            code
          }
        }
      }`,
    {
      ownerId: id,
      namespace: "$app",
      key: "issues",
      type: "json",
      value: JSON.stringify(newIssues),
    },
  );
}

/**
 * @param {string} productId
 * @returns {Promise<Issue[] | undefined>}
 */
export async function getIssues(productId) {
  // This example uses metafields to store the data. For more information, refer to https://shopify.dev/docs/apps/custom-data/metafields.
  const res = await makeGraphQLQuery(
    `query Product($id: ID!) {
        product(id: $id) {
          metafield(namespace: "$app", key: "issues") {
            value
          }
        }
      }`,
    { id: productId },
  );

  if (res?.data?.product?.metafield?.value) {
    return /** @type {Issue[]} */ (
      JSON.parse(res.data.product.metafield.value)
    );
  }
}

/**
 * @param {string} query
 * @param {Record<string, unknown>} variables
 * @returns {Promise<ProductIssuesResponse>}
 */
async function makeGraphQLQuery(query, variables) {
  const graphQLQuery = {
    query,
    variables,
  };

  const res = await fetch("shopify:admin/api/graphql.json", {
    method: "POST",
    body: JSON.stringify(graphQLQuery),
  });

  if (!res.ok) {
    console.error("Network error");
  }

  return await res.json();
}

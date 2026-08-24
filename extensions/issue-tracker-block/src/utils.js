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
 *   errors?: Array<{ message?: string } | null> | null
 * }} ProductIssuesResponse
 */

/**
 * @param {string} id
 * @param {Issue[]} newIssues
 */
export async function updateIssues(id, newIssues) {
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
 * @returns {Promise<Issue[]>}
 */
export async function getIssues(productId) {
  try {
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

    if (res?.errors?.length) {
      console.error(res.errors);
    }

    const rawValue = res?.data?.product?.metafield?.value;
    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error(error);
    return [];
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

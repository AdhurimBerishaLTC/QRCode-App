/**
 * @typedef {{
 *   id?: string
 *   firstName?: string | null
 *   lastName?: string | null
 *   defaultEmailAddress?: { emailAddress?: string | null } | null
 *   legacyResourceId?: string | number | null
 * }} CustomerNode
 *
 * @typedef {{
 *   data?: {
 *     customers?: {
 *       nodes?: CustomerNode[]
 *     } | null
 *   } | null
 *   errors?: Array<{ message?: string } | null> | null
 * }} SearchCustomersResponse
 */

const CUSTOMERS_WITH_DETAILS = `#graphql
  query SearchCustomers($query: String!) {
    customers(first: 8, query: $query) {
      nodes {
        id
        firstName
        lastName
        defaultEmailAddress {
          emailAddress
        }
        legacyResourceId
      }
    }
  }
`;

const CUSTOMERS_IDS_ONLY = `#graphql
  query SearchCustomersIds($query: String!) {
    customers(first: 8, query: $query) {
      nodes {
        id
        legacyResourceId
      }
    }
  }
`;

/**
 * @param {string} queryDocument
 * @param {string} query
 * @returns {Promise<SearchCustomersResponse>}
 */
async function postCustomersQuery(queryDocument, query) {
  const response = await fetch("shopify:admin/api/graphql.json", {
    method: "POST",
    body: JSON.stringify({
      query: queryDocument,
      variables: { query },
    }),
  });

  const text = await response.text();
  /** @type {SearchCustomersResponse} */
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(
      response.ok
        ? "Invalid response from customer search"
        : `Customer search failed (${response.status})`,
    );
  }

  if (!response.ok) {
    throw new Error(
      json.errors?.[0]?.message ||
        `Customer search failed (${response.status})`,
    );
  }

  return json;
}

/**
 * @param {SearchCustomersResponse} json
 * @returns {CustomerNode[]}
 */
function nodesOrThrow(json) {
  const nodes = json.data?.customers?.nodes ?? [];
  if (nodes.length) {
    return nodes;
  }

  const graphError = json.errors?.[0]?.message;
  if (graphError) {
    throw new Error(graphError);
  }

  return [];
}

/**
 * @param {string} message
 * @returns {boolean}
 */
function isProtectedFieldError(message) {
  return /not approved|protected customer|customer_data/i.test(message);
}

/**
 * @param {string} query
 * @returns {Promise<CustomerNode[]>}
 */
export async function searchCustomers(query) {
  const detailed = await postCustomersQuery(CUSTOMERS_WITH_DETAILS, query);
  const detailedNodes = detailed.data?.customers?.nodes ?? [];
  if (detailedNodes.length) {
    return detailedNodes;
  }

  const detailedError = detailed.errors?.[0]?.message ?? "";
  if (detailedError && isProtectedFieldError(detailedError)) {
    const basic = await postCustomersQuery(CUSTOMERS_IDS_ONLY, query);
    return nodesOrThrow(basic);
  }

  return nodesOrThrow(detailed);
}

/**
 * @param {CustomerNode | null | undefined} customer
 * @returns {string}
 */
export function customerLabel(customer) {
  const name = [customer?.firstName, customer?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (name) return name;

  const email = customer?.defaultEmailAddress?.emailAddress;
  if (email) return email;

  const id = customerNumericId(customer);
  return id ? `Customer #${id}` : "Customer";
}

/**
 * @param {CustomerNode | null | undefined} customer
 * @returns {number | null}
 */
export function customerNumericId(customer) {
  const legacy = Number(customer?.legacyResourceId);
  if (legacy) return legacy;

  const match = /Customer\/(\d+)/.exec(String(customer?.id ?? ""));
  return match ? Number(match[1]) : null;
}

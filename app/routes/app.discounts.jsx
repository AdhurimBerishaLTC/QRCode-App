import { useFetcher, useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";

export const FUNCTION_HANDLE = "discount-function-js";
const METAFIELD_NAMESPACE = "$app:qr-discount";
const METAFIELD_KEY = "function-configuration";
const DEFAULT_TITLE = "QR Scan POS";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const response = await admin.graphql(
    `#graphql
      query AutomaticAppDiscounts {
        discountNodes(first: 25, query: "method:automatic") {
          nodes {
            id
            discount {
              __typename
              ... on DiscountAutomaticApp {
                title
                status
                discountId
                discountClasses
                appDiscountType {
                  functionId
                  appKey
                }
              }
            }
          }
        }
      }`,
  );

  const responseJson = await response.json();
  const discounts = (responseJson.data?.discountNodes?.nodes ?? [])
    .map((node) => node.discount)
    .filter((discount) => discount?.__typename === "DiscountAutomaticApp");

  return { discounts };
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(
    `#graphql
      mutation CreateQrAutomaticDiscount($automaticAppDiscount: DiscountAutomaticAppInput!) {
        discountAutomaticAppCreate(automaticAppDiscount: $automaticAppDiscount) {
          automaticAppDiscount {
            discountId
            title
            status
          }
          userErrors {
            field
            message
          }
        }
      }`,
    {
      variables: {
        automaticAppDiscount: {
          title: DEFAULT_TITLE,
          functionHandle: FUNCTION_HANDLE,
          startsAt: new Date().toISOString(),
          discountClasses: ["ORDER", "SHIPPING"],
          context: { all: "ALL" },
          combinesWith: {
            orderDiscounts: true,
            productDiscounts: true,
            shippingDiscounts: true,
          },
          metafields: [
            {
              namespace: METAFIELD_NAMESPACE,
              key: METAFIELD_KEY,
              type: "json",
              value: JSON.stringify({
                orderPercent: 10,
                freeShipping: true,
              }),
            },
          ],
        },
      },
    },
  );

  const responseJson = await response.json();
  const payload = responseJson.data?.discountAutomaticAppCreate;
  const errors = payload?.userErrors ?? [];

  if (errors.length > 0) {
    return { errors };
  }

  return {
    errors: [],
    discount: payload?.automaticAppDiscount ?? null,
  };
};

export default function DiscountsIndex() {
  const { discounts } = useLoaderData();
  const fetcher = useFetcher();
  const errors = fetcher.data?.errors ?? [];
  const isSubmitting = fetcher.state !== "idle";
  const created = fetcher.data?.discount;

  return (
    <s-page heading="QR discounts">
      <s-button
        slot="primary-actions"
        variant="primary"
        loading={isSubmitting}
        onClick={() => fetcher.submit({}, { method: "post" })}
      >
        Create QR discount
      </s-button>
      {errors.length > 0 ? (
        <s-banner tone="critical" heading="Couldn't create the discount.">
          {errors.map((error, index) => (
            <s-paragraph key={index}>{error.message}</s-paragraph>
          ))}
        </s-banner>
      ) : null}
      {created ? (
        <s-banner tone="success" heading="Discount created.">
          <s-paragraph>
            {created.title} is {String(created.status).toLowerCase()} and applies
            on POS Pro as well as the online store.
          </s-paragraph>
        </s-banner>
      ) : null}
      {discounts.length === 0 && !created ? (
        <s-section>
          <s-paragraph>
            Create an automatic QR scan discount (10% off, optional free
            shipping). It uses the same function as the web funnel and applies
            on POS Pro when the cart has <s-text fontWeight="bold">src=qr</s-text>{" "}
            and a customer attached.
          </s-paragraph>
        </s-section>
      ) : (
        <s-section padding="none" accessibilityLabel="Automatic app discounts">
          <s-table>
            <s-table-header-row>
              <s-table-header listSlot="primary">Title</s-table-header>
              <s-table-header>Status</s-table-header>
              <s-table-header>Classes</s-table-header>
            </s-table-header-row>
            <s-table-body>
              {discounts.map((discount) => (
                <s-table-row key={discount.discountId} id={discount.discountId}>
                  <s-table-cell>{discount.title}</s-table-cell>
                  <s-table-cell>{discount.status}</s-table-cell>
                  <s-table-cell>
                    {(discount.discountClasses ?? []).join(", ") || "—"}
                  </s-table-cell>
                </s-table-row>
              ))}
            </s-table-body>
          </s-table>
        </s-section>
      )}
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};

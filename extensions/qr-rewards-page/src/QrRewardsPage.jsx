import "@shopify/ui-extensions/preact";
import { render } from "preact";
import { useEffect, useState } from "preact/hooks";

/**
 * @typedef {{
 *   name: string,
 *   title: string,
 *   quantity: number,
 *   image?: { url: string } | null,
 * }} QrRewardLineItem
 */

/**
 * @typedef {{
 *   id: string,
 *   name: string,
 *   processedAt: string,
 *   lineItems: QrRewardLineItem[],
 * }} QrRewardOrder
 */

export default async () => {
  render(<QrRewardsPage />, document.body);
};

/**
 * @param {string | null | undefined} title
 */
function isQrDiscountTitle(title) {
  const normalized = String(title ?? "").toLowerCase();
  return (
    normalized.includes("qr scan") ||
    normalized.includes("scan qr")
  );
}

/**
 * @param {{
 *   discountApplications?: { nodes?: Array<{ title?: string | null }> } | null,
 *   lineItems?: {
 *     nodes?: Array<{
 *       customAttributes?: Array<{ key?: string | null, value?: string | null }> | null,
 *     }> | null,
 *   } | null,
 * } | null | undefined} order
 */
function isQrOrder(order) {
  const hasQrDiscount = (order?.discountApplications?.nodes ?? []).some(
    (application) => isQrDiscountTitle(application?.title),
  );
  if (hasQrDiscount) {
    return true;
  }

  return (order?.lineItems?.nodes ?? []).some((lineItem) =>
    (lineItem?.customAttributes ?? []).some(
      (attribute) =>
        String(attribute?.key ?? "").toLowerCase() === "src" &&
        String(attribute?.value ?? "").toLowerCase() === "qr",
    ),
  );
}

function QrRewardsPage() {
  const [loading, setLoading] = useState(true);
  const [redeemed, setRedeemed] = useState(false);
  /** @type {[QrRewardOrder | null, (value: QrRewardOrder | null) => void]} */
  const [qrOrder, setQrOrder] = useState(
    /** @type {QrRewardOrder | null} */ (null),
  );

  useEffect(() => {
    loadRewards();
  }, []);

  async function loadRewards() {
    setLoading(true);
    try {
      const response = await fetch(
        "shopify://customer-account/api/2025-10/graphql.json",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: `query QrRewards {
              customer {
                metafield(namespace: "$app", key: "qr_discount_redeemed") {
                  value
                }
                orders(first: 25, sortKey: PROCESSED_AT, reverse: true) {
                  nodes {
                    id
                    name
                    processedAt
                    discountApplications(first: 10) {
                      nodes {
                        ... on AutomaticDiscountApplication {
                          title
                        }
                        ... on DiscountCodeApplication {
                          title: code
                        }
                      }
                    }
                    lineItems(first: 20) {
                      nodes {
                        name
                        title
                        quantity
                        image {
                          url
                        }
                        customAttributes {
                          key
                          value
                        }
                      }
                    }
                  }
                }
              }
            }`,
          }),
        },
      );
      const { data } = await response.json();
      setRedeemed(data?.customer?.metafield?.value === "true");

      const orders = data?.customer?.orders?.nodes ?? [];
      const matched = orders.find(isQrOrder);
      if (matched) {
        setQrOrder({
          id: matched.id,
          name: matched.name,
          processedAt: matched.processedAt,
          lineItems: matched.lineItems?.nodes ?? [],
        });
      } else {
        setQrOrder(null);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <s-page heading={shopify.i18n.translate("pageHeading")}>
      {loading ? (
        <s-spinner accessibilityLabel={shopify.i18n.translate("loading")} />
      ) : (
        <s-stack direction="block" gap="base">
          <s-banner
            heading={shopify.i18n.translate("bannerHeading")}
            tone={redeemed ? "success" : "info"}
          >
            {redeemed
              ? shopify.i18n.translate("redeemed")
              : shopify.i18n.translate("available")}
          </s-banner>

          {qrOrder ? (
            <s-stack direction="block" gap="base">
              <s-heading>
                {shopify.i18n.translate("purchaseHeading", {
                  orderName: qrOrder.name,
                })}
              </s-heading>
              <s-grid gridTemplateColumns="1fr 1fr 1fr" gap="base">
                {qrOrder.lineItems.map((item) => (
                  <s-section key={`${qrOrder.id}-${item.name}`}>
                    <s-stack direction="block" gap="base">
                      {item.image?.url ? (
                        <s-image src={item.image.url} />
                      ) : null}
                      <s-stack direction="block" gap="small-500">
                        <s-text type="strong">{item.title}</s-text>
                        <s-text color="subdued">
                          {shopify.i18n.translate("quantity", {
                            quantity: item.quantity,
                          })}
                        </s-text>
                      </s-stack>
                    </s-stack>
                  </s-section>
                ))}
              </s-grid>
            </s-stack>
          ) : (
            <s-text>{shopify.i18n.translate("empty")}</s-text>
          )}
        </s-stack>
      )}
    </s-page>
  );
}

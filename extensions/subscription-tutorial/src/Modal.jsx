import { render } from "preact";
import { useState, useEffect } from "preact/hooks";
import { fetchSellingPlans } from "./FetchSellingPlans";

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

export default function extension() {
  render(<Modal />, document.body);
}

function Modal() {
  // For this example, we'll just use the first selling plan item
  // Your app should handle displaying multiple line items with selling plan groups.
  const sellingPlanItem = shopify.cart.current.value.lineItems.find(
    (lineItem) => lineItem.hasSellingPlanGroups === true,
  );

  const [response, setResponse] = useState(
    /** @type {SellingPlansResponse | undefined} */ (undefined),
  );

  useEffect(() => {
    async function getSellingPlans() {
      if (sellingPlanItem?.variantId == null) return;
      setResponse(await fetchSellingPlans(sellingPlanItem.variantId));
    }
    getSellingPlans();
  }, [sellingPlanItem]);

  /** @param {SellingPlan} plan */
  const handleClick = (plan) => {
    if (!sellingPlanItem) return;

    shopify.cart.addLineItemSellingPlan({
      lineItemUuid: sellingPlanItem.uuid,
      // convert from GID to ID
      sellingPlanId: Number(plan.id.split("/").pop()),
      sellingPlanName: plan.name,
    });
    window.close();
  };

  const sellingPlanGroups =
    response?.data?.productVariant?.sellingPlanGroups.nodes ?? [];

  return (
    <s-page heading="POS subscription modal">
      <s-scroll-box>
        <s-box padding="small">
          {sellingPlanGroups.map((group) => {
            return (
              <s-section key={`${group.name}-section`} heading={group.name}>
                {group.sellingPlans.nodes.map((plan) => {
                  return (
                    <s-clickable
                      key={`${plan.name}-clickable`}
                      onClick={() => {
                        handleClick(plan);
                      }}
                    >
                      <s-text key={`${plan.name}-text`}>{plan.name}</s-text>
                    </s-clickable>
                  );
                })}
              </s-section>
            );
          })}
        </s-box>
      </s-scroll-box>
    </s-page>
  );
}

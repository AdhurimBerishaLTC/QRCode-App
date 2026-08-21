import { render } from "preact";
import { useState, useEffect } from "preact/hooks";
import { fetchSellingPlans } from "./FetchSellingPlans";

/**
 * @typedef {import('./FetchSellingPlans.js').SellingPlan} SellingPlan
 * @typedef {import('./FetchSellingPlans.js').SellingPlansResponse} SellingPlansResponse
 */

export default function extension() {
  render(<Action />, document.body);
}

function Action() {
  const cartLineItem = shopify.cartLineItem;
  const [response, setResponse] = useState(
    /** @type {SellingPlansResponse | undefined} */ (undefined),
  );

  useEffect(() => {
    async function getSellingPlans() {
      if (cartLineItem?.variantId == null) return;
      setResponse(await fetchSellingPlans(cartLineItem.variantId));
    }
    getSellingPlans();
  }, [cartLineItem]);

  /** @param {SellingPlan} plan */
  const handleClick = (plan) => {
    if (!cartLineItem) return;

    shopify.cart.addLineItemSellingPlan({
      lineItemUuid: cartLineItem.uuid,
      sellingPlanId: Number(plan.id.split("/").pop()),
      sellingPlanName: plan.name,
    });
    window.close();
  };

  const sellingPlanGroups =
    response?.data?.productVariant?.sellingPlanGroups.nodes ?? [];

  return (
    <s-page heading="Subscriptions">
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

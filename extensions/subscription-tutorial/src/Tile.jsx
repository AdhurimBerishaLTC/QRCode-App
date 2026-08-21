import "@shopify/ui-extensions/preact";
import { render } from "preact";
import { useState, useEffect } from "preact/hooks";

export default function extension() {
  render(<Tile />, document.body);
}

function Tile() {
  const [sellingPlanEligible, setSellingPlanEligible] = useState(false);

  useEffect(() => {
    const unsubscribe = shopify.cart.current.subscribe((cart) => {
      const sellingPlanEligibleLineItems = cart.lineItems.find(
        (lineItem) => lineItem.hasSellingPlanGroups === true,
      );
      setSellingPlanEligible(sellingPlanEligibleLineItems !== undefined);
    });
    return unsubscribe;
  }, []);

  return (
    <s-tile
      heading={"Subscriptions"}
      subheading={
        sellingPlanEligible
          ? "Subscriptions available"
          : "Subscriptions not available"
      }
      disabled={!sellingPlanEligible}
      onClick={() => shopify.action.presentModal()}
    />
  );
}

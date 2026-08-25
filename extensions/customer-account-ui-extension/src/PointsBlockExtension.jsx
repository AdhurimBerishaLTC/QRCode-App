import "@shopify/ui-extensions/preact";
import { render } from "preact";

export default async () => {
  render(<PromotionBanner />, document.body);
};

function PromotionBanner() {
  return (
    <s-banner tone="success">
      <s-stack direction="block" inline-alignment="center">
        <s-text>
          🎉 You&apos;ve earned 1,000 points from this order. You&apos;ve been
          upgraded to Platinum tier. <s-link>View rewards</s-link>
        </s-text>
      </s-stack>
    </s-banner>
  );
}

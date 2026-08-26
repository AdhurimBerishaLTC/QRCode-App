import "@shopify/ui-extensions/preact";
import { render } from "preact";

export default async () => {
  render(<LocalizeExtension />, document.body);
};

function LocalizeExtension() {
  const balance = 9.99;
  const formattedBalance = shopify.i18n.formatCurrency(balance);

  const points = 10000;
  const formattedPoints = shopify.i18n.formatNumber(points);

  return (
    <s-banner heading={shopify.i18n.translate("bannerHeading")}>
      <s-stack gap="base">
        <s-text>
          {shopify.i18n.translate("loyaltyPoints", {
            count: points,
            formattedPoints,
          })}
        </s-text>

        <s-text>
          {shopify.i18n.translate("balanceRemaining", {
            formattedBalance,
          })}
        </s-text>
      </s-stack>
    </s-banner>
  );
}

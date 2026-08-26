import "@shopify/ui-extensions/preact";
import { render } from "preact";

export default async () => {
  render(<ProfileBlockExtension />, document.body);
};

function ProfileBlockExtension() {
  return (
    <s-section>
      <s-stack
        direction="inline"
        justifyContent="space-between"
        alignItems="center"
      >
        <s-stack direction="block" gap="small-400">
          <s-heading>{shopify.i18n.translate("heading")}</s-heading>
          <s-text>{shopify.i18n.translate("description")}</s-text>
        </s-stack>
        <s-button variant="primary" href="extension:qr-rewards-page">
          {shopify.i18n.translate("viewRewards")}
        </s-button>
      </s-stack>
    </s-section>
  );
}

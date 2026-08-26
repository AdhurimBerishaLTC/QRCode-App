import "@shopify/ui-extensions/preact";
import { render } from "preact";

export default async () => {
  render(<BlockExtension />, document.body);
};

function BlockExtension() {
  return (
    <s-section>
      <s-stack
        direction="inline"
        justifyContent="space-between"
        alignItems="center"
      >
        <s-stack direction="block" gap="small-400">
          <s-heading>My Wishlist</s-heading>
          <s-text>
            View your favorites and save new looks in your wishlist collections.
          </s-text>
        </s-stack>
        <s-button variant="primary" href="extension:new-pages-customer-ui">
          View wishlist
        </s-button>
      </s-stack>
    </s-section>
  );
}

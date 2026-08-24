import "@shopify/ui-extensions/preact";
import { render } from "preact";
import { useEffect, useState } from "preact/hooks";

export default async () => {
  render(<Tile />, document.body);
};

function Tile() {
  const { i18n } = shopify;
  const [hasCustomer, setHasCustomer] = useState(
    Boolean(shopify.cart.current.value?.customer?.id),
  );

  useEffect(() => {
    const unsubscribe = shopify.cart.current.subscribe((cart) => {
      setHasCustomer(Boolean(cart?.customer?.id));
    });
    return unsubscribe;
  }, []);

  return (
    <s-tile
      heading={i18n.translate("tile_heading")}
      subheading={
        hasCustomer
          ? i18n.translate("tile_subheading")
          : i18n.translate("tile_needs_customer")
      }
      onClick={() => shopify.action.presentModal()}
    />
  );
}

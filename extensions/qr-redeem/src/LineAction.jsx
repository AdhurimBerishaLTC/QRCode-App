import "@shopify/ui-extensions/preact";
import { render } from "preact";
import { useState } from "preact/hooks";

export default async () => {
  render(<LineAction />, document.body);
};

function LineAction() {
  const { i18n } = shopify;
  const lineItem = shopify.cartLineItem;
  const properties = lineItem?.properties ?? {};
  const isQrLine = properties.src === "qr";
  const qrHandle = properties.qr_code || "";
  const [removing, setRemoving] = useState(false);
  const [message, setMessage] = useState("");
  const [removed, setRemoved] = useState(false);

  const stillQr = isQrLine && !removed;

  const removeAttribution = async () => {
    if (!lineItem?.uuid) return;
    setRemoving(true);
    setMessage("");

    try {
      await shopify.cart.removeLineItemProperties(lineItem.uuid, [
        "src",
        "qr_code",
      ]);

      const otherQrLines = (shopify.cart.current.value?.lineItems ?? []).some(
        (item) =>
          item.uuid !== lineItem.uuid && item.properties?.src === "qr",
      );

      if (!otherQrLines) {
        await shopify.cart.removeCartProperties(["src", "qr_code"]);
      }

      setRemoved(true);
      shopify.toast.show(i18n.translate("line_attribution_removed_toast"));
    } catch {
      setMessage(i18n.translate("line_remove_failed"));
    } finally {
      setRemoving(false);
    }
  };

  return (
    <s-page heading={i18n.translate("line_modal_heading")}>
      <s-scroll-box>
        <s-stack direction="block" gap="base" padding="small">
          <s-text>{lineItem?.title}</s-text>

          {stillQr ? (
            <s-stack direction="block" gap="small">
              <s-banner
                heading={i18n.translate("line_qr_banner")}
                tone="success"
              />
              {qrHandle ? (
                <s-text>
                  {i18n.translate("line_qr_handle")}: {qrHandle}
                </s-text>
              ) : null}
              <s-button
                variant="primary"
                tone="critical"
                loading={removing}
                disabled={removing}
                onClick={removeAttribution}
              >
                {i18n.translate("line_remove_attribution")}
              </s-button>
            </s-stack>
          ) : (
            <s-banner
              heading={i18n.translate("line_not_qr_banner")}
              tone="warning"
            >
              <s-text>{i18n.translate("line_not_qr_hint")}</s-text>
            </s-banner>
          )}

          {message ? <s-text>{message}</s-text> : null}
        </s-stack>
      </s-scroll-box>
    </s-page>
  );
}

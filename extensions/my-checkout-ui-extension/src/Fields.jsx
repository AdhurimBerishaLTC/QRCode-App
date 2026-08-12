import "@shopify/ui-extensions/preact";
import { render } from "preact";
import { useState } from "preact/hooks";

export default function () {
  render(<Extension />, document.body);
}

function Extension() {
  const {
    applyMetafieldChange,
    appMetafields,
    i18n: { translate },
    target: { value: deliveryGroupList },
  } = shopify;
  const [checked, setChecked] = useState(false);

  const metafieldNamespace = "custom";
  const metafieldKey = "deliveryinstructions";

  const deliveryInstructions = appMetafields.value.find(
    (appMetafield) =>
      appMetafield.target.type === "cart" &&
      appMetafield.metafield.namespace === metafieldNamespace &&
      appMetafield.metafield.key === metafieldKey,
  );

  // Guard against duplicate rendering for subscription shipping groups.
  if (!deliveryGroupList || deliveryGroupList.groupType !== "oneTimePurchase") {
    return null;
  }

  async function handleChange() {
    setChecked(!checked);
  }

  return (
    <s-stack gap="base">
      <s-checkbox
        checked={checked}
        onChange={handleChange}
        label={translate("deliveryInstructionsCheckbox")}
      />
      {checked && (
        <s-text-area
          label={translate("deliveryInstructions")}
          rows={3}
          onBlur={(event) => {
            const textArea =
              /** @type {HTMLElementTagNameMap['s-text-area'] | null} */ (
                event.currentTarget
              );
            applyMetafieldChange({
              type: "updateCartMetafield",
              metafield: {
                namespace: metafieldNamespace,
                key: metafieldKey,
                type: "multi_line_text_field",
                value: textArea?.value ?? "",
              },
            });
          }}
          value={`${deliveryInstructions?.metafield?.value || ""}`}
        />
      )}
    </s-stack>
  );
}

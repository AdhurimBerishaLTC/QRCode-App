import { useState } from "preact/hooks";

const METAFIELD_NAMESPACE = "custom";
const METAFIELD_KEY = "deliveryinstructions";

/**
 * Delivery instructions checkbox + textarea, persisted as a cart metafield.
 * Shared by the checkout block so it stays visible with the placeable app block.
 */
export function DeliveryInstructions() {
  const { applyMetafieldChange, appMetafields, i18n } = shopify;
  const [checked, setChecked] = useState(false);

  const deliveryInstructions = appMetafields.value?.find(
    (appMetafield) =>
      appMetafield.target.type === "cart" &&
      appMetafield.metafield.namespace === METAFIELD_NAMESPACE &&
      appMetafield.metafield.key === METAFIELD_KEY,
  );

  async function handleChange() {
    setChecked((prev) => !prev);
  }

  return (
    <s-stack gap="base">
      <s-checkbox
        checked={checked}
        onChange={handleChange}
        label={i18n.translate("deliveryInstructionsCheckbox")}
      />
      {checked && (
        <s-text-area
          label={i18n.translate("deliveryInstructions")}
          rows={3}
          onBlur={(event) => {
            const textArea =
              /** @type {HTMLElementTagNameMap['s-text-area'] | null} */ (
                event.currentTarget
              );
            applyMetafieldChange({
              type: "updateCartMetafield",
              metafield: {
                namespace: METAFIELD_NAMESPACE,
                key: METAFIELD_KEY,
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

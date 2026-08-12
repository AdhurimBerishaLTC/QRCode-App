import "@shopify/ui-extensions/preact";
import { render } from "preact";
import { DeliveryInstructions } from "./DeliveryInstructions.jsx";

export default async () => {
  render(<Extension />, document.body);
};

function Extension() {
  const {
    heading: merchantHeading,
    description,
    collapsible,
    tone: merchantTone,
  } = shopify.settings.value;

  const inEditor = Boolean(shopify.extension.editor);
  const hasBanner =
    typeof merchantHeading === "string" && merchantHeading.length > 0;

  // Dev preview can inject an extra unconfigured instance alongside the
  // merchant-placed block. Skip that ghost on the storefront.
  if (!hasBanner && !inEditor) {
    return null;
  }

  const tone =
    merchantTone === "info" ||
    merchantTone === "auto" ||
    merchantTone === "success" ||
    merchantTone === "warning" ||
    merchantTone === "critical"
      ? merchantTone
      : "info";
  const descriptionText =
    typeof description === "string" ? description : undefined;
  const isCollapsible = collapsible === true;

  return (
    <s-stack gap="base">
      {hasBanner && (
        <s-banner
          heading={merchantHeading}
          tone={tone}
          collapsible={isCollapsible}
        >
          {descriptionText}
        </s-banner>
      )}
      <DeliveryInstructions />
    </s-stack>
  );
}

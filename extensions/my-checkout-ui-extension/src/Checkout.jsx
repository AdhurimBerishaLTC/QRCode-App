import "@shopify/ui-extensions/preact";
import { render } from "preact";

export default async () => {
  render(<Extension />, document.body);
};

function Extension() {
  // Use the merchant-defined settings to retrieve the extension's content
  const {
    heading: merchantHeading,
    description,
    collapsible,
    tone: merchantTone,
  } = shopify.settings.value;

  // Dev preview can inject an extra unconfigured instance alongside the
  // merchant-placed block. Skip rendering until settings are configured.
  if (typeof merchantHeading !== "string" || merchantHeading.length === 0) {
    return null;
  }

  // Settings values are typed as string | number | boolean; narrow for banner props
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
    <s-banner heading={merchantHeading} tone={tone} collapsible={isCollapsible}>
      {descriptionText}
    </s-banner>
  );
}

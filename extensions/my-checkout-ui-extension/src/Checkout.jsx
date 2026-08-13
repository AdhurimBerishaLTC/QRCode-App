import "@shopify/ui-extensions/preact";
import { render } from "preact";
import { DeliveryInstructions } from "./DeliveryInstructions.jsx";
import { AttributionSurvey } from "./AttributionSurvey.jsx";

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

  const hasBanner =
    typeof merchantHeading === "string" && merchantHeading.length > 0;

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
      <AttributionSurvey />
    </s-stack>
  );
}

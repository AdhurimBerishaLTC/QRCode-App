import "@shopify/ui-extensions/preact";
import { render } from "preact";
import { useState } from "preact/hooks";
import { useSettings } from "@shopify/ui-extensions/customer-account/preact";
import {
  Survey,
  settingString,
  useRenderOnce,
  useStorageState,
} from "./shared.jsx";

export default function () {
  render(<ProductReview />, document.body);
}

function ProductReview() {
  const settings = useSettings();
  const { i18n, order } = shopify;
  const orderValue = order.value;
  const [productReview, setProductReview] = useState("");
  const [loading, setLoading] = useState(false);

  // Scope by order so a previous submit doesn't hide the survey on every order.
  const storageKey = orderValue?.id
    ? `product-reviewed:${orderValue.id}`
    : "product-reviewed";
  const [productReviewed, setProductReviewed] = useStorageState(storageKey);

  const slotKey = orderValue?.id
    ? `survey-once:order-status:${orderValue.id}`
    : "survey-once:order-status";
  const renderOnce = useRenderOnce(slotKey);

  // Settings win when set; otherwise fall back to locale defaults.
  const title = settingString(
    settings.review_title,
    i18n.translate("reviewTitle"),
  );
  const description = settingString(
    settings.review_description,
    i18n.translate("reviewDescription"),
  );
  const option5 = settingString(
    settings.review_option_5,
    i18n.translate("reviewOption5"),
  );
  const option4 = settingString(
    settings.review_option_4,
    i18n.translate("reviewOption4"),
  );
  const option3 = settingString(
    settings.review_option_3,
    i18n.translate("reviewOption3"),
  );
  const option2 = settingString(
    settings.review_option_2,
    i18n.translate("reviewOption2"),
  );

  async function handleSubmit() {
    setLoading(true);
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log("Submitted:", productReview);
        setLoading(false);
        setProductReviewed(true);
        resolve(undefined);
      }, 750);
    });
  }

  // Always preview in the editor, even if storage says submitted.
  const inEditor = Boolean(shopify.extension.editor);
  if (
    !inEditor &&
    (renderOnce.loading ||
      !renderOnce.shouldRender ||
      productReviewed.loading ||
      productReviewed.data === true)
  ) {
    return null;
  }

  return (
    <Survey
      title={title}
      description={description}
      onSubmit={handleSubmit}
      loading={loading}
    >
      <s-choice-list
        name="product-review"
        values={productReview ? [productReview] : []}
        onChange={(event) => {
          const target =
            /** @type {HTMLElementTagNameMap['s-choice-list'] | null} */ (
              event.currentTarget
            );
          setProductReview(target?.values?.[0] ?? "");
        }}
      >
        <s-choice value="5">{option5}</s-choice>
        <s-choice value="4">{option4}</s-choice>
        <s-choice value="3">{option3}</s-choice>
        <s-choice value="2">{option2}</s-choice>
      </s-choice-list>
    </Survey>
  );
}

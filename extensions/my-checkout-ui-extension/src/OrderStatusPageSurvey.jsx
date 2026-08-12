import "@shopify/ui-extensions/preact";
import { render } from "preact";
import { useState } from "preact/hooks";
import { useSettings } from "@shopify/ui-extensions/customer-account/preact";
import { Survey, settingString, useStorageState } from "./shared.jsx";

export default function () {
  render(<ProductReview />, document.body);
}

function ProductReview() {
  const settings = useSettings();
  const order = shopify.order.value;
  const [productReview, setProductReview] = useState("");
  const [loading, setLoading] = useState(false);

  // Scope by order so a previous submit doesn't hide the survey on every order.
  const storageKey = order?.id
    ? `product-reviewed:${order.id}`
    : "product-reviewed";
  const [productReviewed, setProductReviewed] = useStorageState(storageKey);

  const title = settingString(
    settings.review_title,
    "How do you like your purchase?",
  );
  const description = settingString(
    settings.review_description,
    "We would like to learn if you are enjoying your purchase.",
  );
  const option5 = settingString(
    settings.review_option_5,
    "Amazing! Very happy with it.",
  );
  const option4 = settingString(
    settings.review_option_4,
    "It's okay, I expected more.",
  );
  const option3 = settingString(
    settings.review_option_3,
    "Eh. There are better options out there.",
  );
  const option2 = settingString(
    settings.review_option_2,
    "I regret the purchase.",
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
  if (!inEditor && (productReviewed.loading || productReviewed.data === true)) {
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

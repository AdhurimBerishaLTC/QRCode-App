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

const METAFIELD_NAMESPACE = "custom";
const METAFIELD_KEY = "product_review";
const CUSTOMER_ACCOUNT_API =
  "shopify://customer-account/api/2026-07/graphql.json";

export default function () {
  render(<ProductReview />, document.body);
}

function ProductReview() {
  const settings = useSettings();
  const { i18n, order } = shopify;
  const orderValue = order.value;
  const [productReview, setProductReview] = useState("");
  const [loading, setLoading] = useState(false);

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

  const reviewLabels = {
    5: option5,
    4: option4,
    3: option3,
    2: option2,
  };

  /**
   * @param {string} key
   * @returns {string}
   */
  function answerLabelFor(key) {
    if (key === "5" || key === "4" || key === "3" || key === "2") {
      return reviewLabels[key];
    }
    return key;
  }

  async function handleSubmit() {
    if (!productReview) {
      throw new Error("Select an answer before submitting.");
    }

    const orderId = orderValue?.id;
    if (!orderId) {
      throw new Error("Order is not available.");
    }

    setLoading(true);
    try {
      const answerLabel = answerLabelFor(productReview);
      const response = await fetch(CUSTOMER_ACCOUNT_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `mutation SetProductReview($metafields: [MetafieldsSetInput!]!) {
            metafieldsSet(metafields: $metafields) {
              metafields {
                key
                value
              }
              userErrors {
                field
                message
              }
            }
          }`,
          variables: {
            metafields: [
              {
                ownerId: orderId,
                namespace: METAFIELD_NAMESPACE,
                key: METAFIELD_KEY,
                type: "single_line_text_field",
                value: answerLabel,
              },
            ],
          },
        }),
      });

      const json = await response.json();
      const userErrors = json.data?.metafieldsSet?.userErrors ?? [];
      if (!response.ok || json.errors?.length || userErrors.length) {
        console.error(
          "Failed to save product review",
          json.errors ?? userErrors,
        );
        throw new Error(
          userErrors[0]?.message ??
            json.errors?.[0]?.message ??
            "Failed to save product review",
        );
      }

      setProductReviewed(true);
    } finally {
      setLoading(false);
    }
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

import { useState } from "preact/hooks";
import { useSettings } from "@shopify/ui-extensions/checkout/preact";
import {
  Survey,
  settingString,
  useRenderOnce,
  useStorageState,
} from "./shared.jsx";

const METAFIELD_NAMESPACE = "custom";
const METAFIELD_KEY = "sale_attribution";

/**
 * "How did you hear about us?" survey on checkout.
 * Saves to a cart metafield that can copy onto the order (no backend URL).
 */
export function AttributionSurvey() {
  const settings = useSettings();
  const { applyMetafieldChange, i18n, checkoutToken } = shopify;
  const [attribution, setAttribution] = useState("");
  const [loading, setLoading] = useState(false);

  const storageKey = checkoutToken?.value
    ? `attribution-submitted:${checkoutToken.value}`
    : "attribution-submitted";
  const [attributionSubmitted, setAttributionSubmitted] =
    useStorageState(storageKey);

  const slotKey = checkoutToken?.value
    ? `survey-once:checkout-attribution:${checkoutToken.value}`
    : "survey-once:checkout-attribution";
  const renderOnce = useRenderOnce(slotKey);

  const title = settingString(
    settings.attribution_title,
    i18n.translate("attributionTitle"),
  );
  const description = settingString(
    settings.attribution_description,
    i18n.translate("attributionDescription"),
  );
  const optionTv = settingString(
    settings.attribution_option_tv,
    i18n.translate("attributionOptionTv"),
  );
  const optionPodcast = settingString(
    settings.attribution_option_podcast,
    i18n.translate("attributionOptionPodcast"),
  );
  const optionFamily = settingString(
    settings.attribution_option_family,
    i18n.translate("attributionOptionFamily"),
  );
  const optionTiktok = settingString(
    settings.attribution_option_tiktok,
    i18n.translate("attributionOptionTiktok"),
  );

  const attributionLabels = {
    tv: optionTv,
    podcast: optionPodcast,
    family: optionFamily,
    tiktok: optionTiktok,
  };

  /**
   * @param {string} key
   * @returns {string}
   */
  function answerLabelFor(key) {
    if (key === "tv" || key === "podcast" || key === "family" || key === "tiktok") {
      return attributionLabels[key];
    }
    return key;
  }

  async function handleSubmit() {
    if (!attribution) {
      throw new Error("Select an answer before submitting.");
    }

    setLoading(true);
    try {
      const answerLabel = answerLabelFor(attribution);
      const result = await applyMetafieldChange({
        type: "updateCartMetafield",
        metafield: {
          namespace: METAFIELD_NAMESPACE,
          key: METAFIELD_KEY,
          type: "single_line_text_field",
          value: answerLabel,
        },
      });

      if (result.type === "error") {
        console.error("Failed to save attribution", result.message);
        throw new Error(result.message ?? "Failed to save attribution");
      }

      console.log("Saved sale_attribution cart metafield:", answerLabel);
      setAttributionSubmitted(true);
    } finally {
      setLoading(false);
    }
  }

  const inEditor = Boolean(shopify.extension.editor);
  if (
    !inEditor &&
    (renderOnce.loading ||
      !renderOnce.shouldRender ||
      attributionSubmitted.loading ||
      attributionSubmitted.data === true)
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
        name="sale-attribution"
        values={attribution ? [attribution] : []}
        onChange={(event) => {
          const target =
            /** @type {HTMLElementTagNameMap['s-choice-list'] | null} */ (
              event.currentTarget
            );
          setAttribution(target?.values?.[0] ?? "");
        }}
      >
        <s-choice value="tv">{optionTv}</s-choice>
        <s-choice value="podcast">{optionPodcast}</s-choice>
        <s-choice value="family">{optionFamily}</s-choice>
        <s-choice value="tiktok">{optionTiktok}</s-choice>
      </s-choice-list>
    </Survey>
  );
}

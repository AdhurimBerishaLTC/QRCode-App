import "@shopify/ui-extensions/preact";
import { render } from "preact";
import { useState } from "preact/hooks";
import { useSettings } from "@shopify/ui-extensions/checkout/preact";
import { Survey, settingString, useStorageState } from "./shared.jsx";

export default function () {
  render(<Attribution />, document.body);
}

function Attribution() {
  const settings = useSettings();
  const { i18n } = shopify;
  const [attribution, setAttribution] = useState("");
  const [loading, setLoading] = useState(false);
  const [attributionSubmitted, setAttributionSubmitted] = useStorageState(
    "attribution-submitted",
  );

  // Settings win when set; otherwise fall back to locale defaults.
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

  async function handleSubmit() {
    setLoading(true);
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log("Submitted:", attribution);
        setLoading(false);
        setAttributionSubmitted(true);
        resolve(undefined);
      }, 750);
    });
  }

  // Always preview in the editor, even if storage says submitted.
  const inEditor = Boolean(shopify.extension.editor);
  if (
    !inEditor &&
    (attributionSubmitted.loading || attributionSubmitted.data === true)
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

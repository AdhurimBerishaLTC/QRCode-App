import { render } from "preact";
import { useState } from "preact/hooks";
import { Survey, useStorageState } from "./shared.jsx";

export default function () {
  render(<Attribution />, document.body);
}
function Attribution() {
  const [attribution, setAttribution] = useState("");
  const [loading, setLoading] = useState(false);
  // Store into local storage if the attribution survey was completed by the customer.
  const [attributionSubmitted, setAttributionSubmitted] = useStorageState(
    "attribution-submitted",
  );

  async function handleSubmit() {
    // Simulate a server request
    setLoading(true);
    return new Promise((resolve) => {
      setTimeout(() => {
        // Send the review to the server
        console.log("Submitted:", attribution);
        setLoading(false);
        setAttributionSubmitted(true);
        resolve(undefined);
      }, 750);
    });
  }

  // Hides the survey if the attribution has already been submitted
  if (attributionSubmitted.loading || attributionSubmitted.data === true) {
    return null;
  }

  return (
    <Survey
      title="How did you hear about us?"
      description="We would like to learn if you are enjoying your purchase."
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
        <s-choice value="tv">TV</s-choice>
        <s-choice value="podcast">Podcast</s-choice>
        <s-choice value="family">From a friend or family member</s-choice>
        <s-choice value="tiktok">Tiktok</s-choice>
      </s-choice-list>
    </Survey>
  );
}

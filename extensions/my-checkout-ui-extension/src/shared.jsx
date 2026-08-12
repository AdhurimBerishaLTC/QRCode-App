import { useState, useCallback, useEffect } from "preact/hooks";
import PropTypes from "prop-types";

/**
 * Returns a piece of state that is persisted in local storage, and a function to update it.
 * The state returned contains a `data` property with the value, and a `loading` property that is true while the value is being fetched from storage.
 * @param {string} key
 * @returns {[{data: unknown, loading: boolean}, (value: unknown) => void]}
 */
export function useStorageState(key) {
  const { storage } = shopify;
  const [data, setData] = useState(/** @type {unknown} */ (undefined));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function queryStorage() {
      const value = await storage.read(key);
      setData(value);
      setLoading(false);
    }
    queryStorage();
  }, [storage, key]);

  const setStorage = useCallback(
    /** @param {unknown} value */
    (value) => {
      // Persist only — don't update React state here. Updating `data` would
      // unmount Survey in parents before the thanks message can render.
      storage.write(key, value);
    },
    [storage, key],
  );

  return [{ data, loading }, setStorage];
}

/**
 * Reads a merchant setting as a string, falling back when unset.
 * @param {unknown} value
 * @param {string} fallback
 * @returns {string}
 */
export function settingString(value, fallback) {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

/**
 * @param {{
 *   title: string,
 *   description: string,
 *   onSubmit: () => void | Promise<void>,
 *   children?: import('preact').ComponentChildren,
 *   loading?: boolean,
 * }} props
 */
export function Survey({ title, description, onSubmit, children, loading }) {
  const { i18n } = shopify;
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit() {
    await onSubmit();
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <s-box border="base" padding="base" borderRadius="base">
        <s-stack gap="base">
          <s-heading>{i18n.translate("thanksForFeedback")}</s-heading>
          <s-text>{i18n.translate("responseSubmitted")}</s-text>
        </s-stack>
      </s-box>
    );
  }

  return (
    <s-box border="base" padding="base" borderRadius="base">
      <s-stack gap="base">
        <s-heading>{title}</s-heading>
        <s-text>{description}</s-text>
        {children}
        <s-button variant="secondary" onClick={handleSubmit} loading={loading}>
          {i18n.translate("submitFeedback")}
        </s-button>
      </s-stack>
    </s-box>
  );
}

Survey.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  onSubmit: PropTypes.func.isRequired,
  children: PropTypes.node,
  loading: PropTypes.bool,
};

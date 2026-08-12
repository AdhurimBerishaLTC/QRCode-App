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
 * @param {{
 *   title: string,
 *   description: string,
 *   onSubmit: () => void | Promise<void>,
 *   children?: import('preact').ComponentChildren,
 *   loading?: boolean,
 * }} props
 */
export function Survey({ title, description, onSubmit, children, loading }) {
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit() {
    await onSubmit();
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <s-box border="base" padding="base" borderRadius="base">
        <s-stack gap="base">
          <s-heading>Thanks for your feedback!</s-heading>
          <s-text>Your response has been submitted</s-text>
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
          Submit feedback
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

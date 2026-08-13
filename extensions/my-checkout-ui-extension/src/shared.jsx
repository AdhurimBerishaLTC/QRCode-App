import { useState, useCallback, useEffect, useMemo } from "preact/hooks";
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

/** Fresh claim window while sibling instances race on mount. */
const RENDER_ONCE_CLAIM_MS = 2000;

/**
 * @param {unknown} value
 * @returns {{id: string, at: number} | null}
 */
function readClaim(value) {
  if (
    value &&
    typeof value === "object" &&
    typeof /** @type {{id?: unknown}} */ (value).id === "string" &&
    typeof /** @type {{at?: unknown}} */ (value).at === "number"
  ) {
    return /** @type {{id: string, at: number}} */ (value);
  }
  return null;
}

/**
 * Ensures only one extension instance renders this UI on the storefront.
 * Shopify can mount the same survey more than once (extra placements or
 * simultaneous mounts). Storage is shared across instances, so we race-claim
 * a slot and only the winner renders. Heartbeats keep the winning claim alive;
 * stale claims from a previous page load are ignored.
 * @param {string} slotKey
 * @returns {{loading: boolean, shouldRender: boolean}}
 */
export function useRenderOnce(slotKey) {
  const { storage, extension } = shopify;
  const inEditor = Boolean(extension.editor);
  const instanceId = useMemo(
    () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
    [],
  );
  const [loading, setLoading] = useState(!inEditor);
  const [shouldRender, setShouldRender] = useState(inEditor);

  useEffect(() => {
    if (inEditor) {
      setLoading(false);
      setShouldRender(true);
      return;
    }

    let cancelled = false;
    const poll = { id: 0 };

    async function claim() {
      const now = Date.now();
      const existing = readClaim(await storage.read(slotKey));
      if (
        existing &&
        existing.id !== instanceId &&
        now - existing.at < RENDER_ONCE_CLAIM_MS
      ) {
        if (!cancelled) {
          setShouldRender(false);
          setLoading(false);
        }
        return;
      }

      const token = { id: instanceId, at: now };
      await storage.write(slotKey, token);
      // Let sibling instances finish their writes before picking a winner.
      await new Promise((resolve) => setTimeout(resolve, 150));
      const winner = readClaim(await storage.read(slotKey));
      if (cancelled) return;
      setShouldRender(Boolean(winner && winner.id === instanceId));
      setLoading(false);

      poll.id = window.setInterval(() => {
        storage.read(slotKey).then((value) => {
          const current = readClaim(value);
          if (cancelled) return;
          if (current && current.id === instanceId) {
            storage.write(slotKey, { id: instanceId, at: Date.now() });
            setShouldRender(true);
          } else {
            setShouldRender(false);
          }
        });
      }, 500);
    }

    claim();

    return () => {
      cancelled = true;
      if (poll.id) window.clearInterval(poll.id);
      storage.read(slotKey).then((value) => {
        const current = readClaim(value);
        if (current?.id === instanceId) {
          storage.delete(slotKey);
        }
      });
    };
  }, [storage, slotKey, instanceId, inEditor]);

  return { loading, shouldRender };
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
    try {
      await onSubmit();
      setSubmitted(true);
    } catch (error) {
      console.error(error);
    }
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

import "@shopify/ui-extensions/preact";
import { render } from "preact";
import { useEffect, useState } from "preact/hooks";
import {
  fetchCustomerQrStatus,
  isCustomerQrRedeemed,
} from "./FetchCustomer";

export default async () => {
  render(<CustomerBlock />, document.body);
};

function CustomerBlock() {
  const { i18n } = shopify;
  const customerId = shopify.customer?.id;
  const [loading, setLoading] = useState(true);
  const [alreadyRedeemed, setAlreadyRedeemed] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!customerId) {
      setLoading(false);
      setFailed(true);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setFailed(false);
      try {
        const customer = await fetchCustomerQrStatus(customerId);
        if (!cancelled) {
          setAlreadyRedeemed(isCustomerQrRedeemed(customer));
        }
      } catch {
        if (!cancelled) {
          setFailed(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [customerId]);

  if (loading) {
    return (
      <s-box padding="small">
        <s-text>{i18n.translate("looking_up")}</s-text>
      </s-box>
    );
  }

  if (failed) {
    return (
      <s-box padding="small">
        <s-stack direction="block" gap="small">
          <s-heading>{i18n.translate("customer_block_heading")}</s-heading>
          <s-text>{i18n.translate("customer_block_unavailable")}</s-text>
        </s-stack>
      </s-box>
    );
  }

  return (
    <s-box padding="small">
      <s-stack direction="block" gap="small">
        <s-heading>{i18n.translate("customer_block_heading")}</s-heading>
        {alreadyRedeemed ? (
          <s-stack direction="block" gap="small">
            <s-badge tone="info">
              {i18n.translate("customer_block_redeemed")}
            </s-badge>
            <s-text>{i18n.translate("already_redeemed_hint")}</s-text>
          </s-stack>
        ) : (
          <s-badge tone="success">
            {i18n.translate("customer_block_available")}
          </s-badge>
        )}
      </s-stack>
    </s-box>
  );
}

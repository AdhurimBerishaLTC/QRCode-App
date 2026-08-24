import "@shopify/ui-extensions/preact";
import { render } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import {
  customerLabel,
  customerNumericId,
  fetchCustomerQrStatus,
  isCustomerQrRedeemed,
  searchCustomers,
} from "./FetchCustomer";
import { fetchQrCode, parseQrHandle, variantNumericId } from "./FetchQrCode";

/**
 * @typedef {"scanning" | "loading" | "confirm" | "success" | "error"} RedeemStatus
 * @typedef {{ data?: string }} ScanResult
 * @typedef {{
 *   variantId: number,
 *   productTitle: string,
 *   handle: string,
 *   variantTitle: string,
 *   price: string | null,
 *   imageUrl: string | null
 * }} PendingItem
 * @typedef {import("./FetchCustomer").CustomerNode} CustomerNode
 */

export default async () => {
  render(<Modal />, document.body);
};

function cameraScanner() {
  return shopify.scanner;
}

function Modal() {
  const { i18n } = shopify;
  const scanner = cameraScanner();
  const [hasCustomer, setHasCustomer] = useState(
    Boolean(shopify.cart.current.value?.customer?.id),
  );
  const [status, setStatus] = useState("scanning");
  const [message, setMessage] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [pendingItem, setPendingItem] = useState(
    /** @type {PendingItem | null} */ (null),
  );
  const [customerResults, setCustomerResults] = useState(
    /** @type {CustomerNode[]} */ ([]),
  );
  const [customerQuery, setCustomerQuery] = useState("");
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [attachingCustomer, setAttachingCustomer] = useState(false);
  const [customerMessage, setCustomerMessage] = useState("");
  const [customerAlreadyRedeemed, setCustomerAlreadyRedeemed] = useState(false);
  const lastScanned = useRef("");

  useEffect(() => {
    const unsubscribe = shopify.cart.current.subscribe((cart) => {
      setHasCustomer(Boolean(cart?.customer?.id));
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (status !== "confirm" || !hasCustomer) return;

    const cartCustomerId = shopify.cart.current.value?.customer?.id;
    if (!cartCustomerId) {
      setCustomerAlreadyRedeemed(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const customer = await fetchCustomerQrStatus(cartCustomerId);
        if (!cancelled) {
          setCustomerAlreadyRedeemed(isCustomerQrRedeemed(customer));
        }
      } catch {
        if (!cancelled) {
          setCustomerAlreadyRedeemed(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status, hasCustomer]);

  useEffect(() => {
    scanner.showCameraScanner();

    const unsubscribe = scanner.scannerData.current.subscribe(async (scan) => {
      if (!scan.data || scan.data === lastScanned.current) return;
      lastScanned.current = scan.data;

      setStatus("loading");
      scanner.hideCameraScanner();

      const handle = parseQrHandle(scan.data);
      if (!handle) {
        setMessage(i18n.translate("invalid_qr"));
        setStatus("error");
        return;
      }

      try {
        const result = await fetchQrCode(handle);
        const metaobject = result.data?.metaobjectByHandle;
        if (!metaobject) {
          setMessage(i18n.translate("not_found"));
          setStatus("error");
          return;
        }

        const variantId =
          Number(metaobject.productVariant?.reference?.legacyResourceId) ||
          variantNumericId(metaobject.productVariant?.reference?.id);

        if (!variantId) {
          setMessage(i18n.translate("missing_variant"));
          setStatus("error");
          return;
        }

        const variantRef = metaobject.productVariant?.reference;

        const variantTitle =
          variantRef?.title && variantRef.title !== "Default Title"
            ? variantRef.title
            : i18n.translate("default_variant");

        const price = variantRef?.price ?? null;

        const imageUrl =
          variantRef?.image?.url ??
          variantRef?.product?.featuredImage?.url ??
          null;

        const productTitle =
          metaobject.product?.reference?.title ||
          metaobject.title?.jsonValue ||
          i18n.translate("unknown_product");

        setPendingItem({
          variantId,
          handle,
          productTitle,
          variantTitle,
          price,
          imageUrl,
        });
        setQuantity(1);
        setCustomerResults([]);
        setCustomerQuery("");
        setCustomerMessage("");
        setCustomerAlreadyRedeemed(false);
        setStatus("confirm");
      } catch {
        setMessage(i18n.translate("add_failed"));
        setStatus("error");
      }
    });

    return () => {
      unsubscribe();
      scanner.hideCameraScanner();
    };
  }, []);

  /**
   * @param {{ currentTarget?: { value?: string } | null, target?: { value?: string } | null } | null | undefined} event
   */
  const fieldValue = (event) => {
    const el = event?.currentTarget ?? event?.target;
    return String(el?.value ?? "").trim();
  };

  /**
   * @param {string} rawQuery
   */
  const runCustomerSearch = async (rawQuery) => {
    const query = String(rawQuery ?? "").trim();
    if (!query) {
      setCustomerResults([]);
      setCustomerMessage("");
      return;
    }

    setSearchingCustomers(true);
    setCustomerMessage("");

    try {
      const nodes = await searchCustomers(query);
      setCustomerResults(nodes);
      if (!nodes.length) {
        setCustomerMessage(i18n.translate("no_customers"));
      }
    } catch (error) {
      setCustomerResults([]);
      const detail = error instanceof Error ? error.message : "";
      if (/access denied|read_customers|access scope/i.test(detail)) {
        setCustomerMessage(i18n.translate("search_access_denied"));
      } else if (detail) {
        setCustomerMessage(detail);
      } else {
        setCustomerMessage(i18n.translate("search_failed"));
      }
    } finally {
      setSearchingCustomers(false);
    }
  };

  /**
   * @param {{ currentTarget?: { value?: string } | null, target?: { value?: string } | null }} event
   */
  const handleCustomerInput = (event) => {
    setCustomerQuery(fieldValue(event));
  };

  /**
   * @param {{ currentTarget?: { value?: string } | null, target?: { value?: string } | null }} event
   */
  const handleCustomerSearch = (event) => {
    const query = fieldValue(event) || customerQuery;
    setCustomerQuery(query);
    runCustomerSearch(query);
  };

  /** @param {CustomerNode} customer */
  const attachCustomer = async (customer) => {
    const id = customerNumericId(customer);
    if (!id) {
      setCustomerMessage(i18n.translate("attach_failed"));
      return;
    }

    setAttachingCustomer(true);
    setCustomerMessage("");

    try {
      await shopify.cart.setCustomer({ id });
      setCustomerAlreadyRedeemed(isCustomerQrRedeemed(customer));
      setCustomerResults([]);
    } catch {
      setCustomerMessage(i18n.translate("attach_failed"));
    } finally {
      setAttachingCustomer(false);
    }
  };

  const handleConfirm = async () => {
    if (!pendingItem || !hasCustomer) return;
    setStatus("loading");

    try {
      const uuid = await shopify.cart.addLineItem(
        pendingItem.variantId,
        quantity,
      );
      if (!uuid) {
        setMessage(i18n.translate("add_failed"));
        setStatus("error");
        return;
      }
      await shopify.cart.addLineItemProperties(uuid, {
        src: "qr",
        qr_code: pendingItem.handle,
      });
      await shopify.cart.addCartProperties({
        src: "qr",
        qr_code: pendingItem.handle,
      });

      setMessage(pendingItem.productTitle);
      setStatus("success");
      shopify.toast.show(i18n.translate("added_toast"));
    } catch {
      setMessage(i18n.translate("add_failed"));
      setStatus("error");
    }
  };

  const rescan = () => {
    lastScanned.current = "";
    setPendingItem(null);
    setQuantity(1);
    setMessage("");
    setCustomerResults([]);
    setCustomerQuery("");
    setCustomerMessage("");
    setCustomerAlreadyRedeemed(false);
    setStatus("scanning");
    scanner.showCameraScanner();
  };

  if (status === "loading") {
    return (
      <s-page heading={i18n.translate("modal_heading")}>
        <s-scroll-box>
          <s-box padding="small">
            <s-text>{i18n.translate("looking_up")}</s-text>
          </s-box>
        </s-scroll-box>
      </s-page>
    );
  }

  if (status === "confirm") {
    return (
      <s-page heading={i18n.translate("modal_heading")}>
        <s-scroll-box>
          <s-stack direction="block" gap="base" padding="small">
            <s-text>{pendingItem?.productTitle}</s-text>

            <s-image src={pendingItem?.imageUrl ?? undefined} />

            <s-stack direction="inline" gap="small" alignItems="center">
              <s-button
                variant="secondary"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              >
                −
              </s-button>

              <s-text>{quantity}</s-text>

              <s-button
                variant="secondary"
                onClick={() => setQuantity((q) => Math.min(99, q + 1))}
              >
                +
              </s-button>
            </s-stack>

            <s-text>{pendingItem?.variantTitle}</s-text>

            <s-text>
              {shopify.i18n.formatCurrency(Number(pendingItem?.price ?? 0), {
                currency: shopify.session.currentSession.currency,
              })}
            </s-text>

            {hasCustomer ? (
              <s-stack direction="block" gap="small">
                {customerAlreadyRedeemed ? (
                  <s-banner
                    heading={i18n.translate("already_redeemed_banner")}
                    tone="info"
                  >
                    <s-text>{i18n.translate("already_redeemed_hint")}</s-text>
                  </s-banner>
                ) : (
                  <s-banner
                    heading={i18n.translate("customer_attached")}
                    tone="success"
                  />
                )}
              </s-stack>
            ) : (
              <s-stack direction="block" gap="small">
                <s-banner
                  heading={i18n.translate("needs_customer")}
                  tone="warning"
                />
                <s-search-field
                  placeholder={i18n.translate("search_customer")}
                  value={customerQuery}
                  disabled={searchingCustomers || attachingCustomer}
                  onInput={handleCustomerInput}
                  onChange={handleCustomerSearch}
                />
                <s-button
                  variant="secondary"
                  disabled={
                    searchingCustomers ||
                    attachingCustomer ||
                    !customerQuery.trim()
                  }
                  onClick={() => runCustomerSearch(customerQuery)}
                >
                  {i18n.translate("search_customer_button")}
                </s-button>
                {searchingCustomers ? (
                  <s-text>{i18n.translate("looking_up")}</s-text>
                ) : null}
                {customerMessage ? <s-text>{customerMessage}</s-text> : null}
                {customerResults.map((customer, index) => {
                  const alreadyRedeemed = isCustomerQrRedeemed(customer);
                  return (
                    <s-stack key={customer.id} direction="block" gap="none">
                      {index > 0 ? <s-divider /> : null}
                      <s-clickable
                        disabled={attachingCustomer}
                        onClick={() => attachCustomer(customer)}
                      >
                        <s-stack direction="block" gap="none">
                          <s-text>{customerLabel(customer)}</s-text>
                          <s-text>
                            {customer.defaultEmailAddress?.emailAddress || ""}
                          </s-text>
                          {alreadyRedeemed ? (
                            <s-text>
                              {i18n.translate("already_redeemed")}
                            </s-text>
                          ) : null}
                        </s-stack>
                      </s-clickable>
                    </s-stack>
                  );
                })}
              </s-stack>
            )}

            <s-button
              variant="primary"
              disabled={!hasCustomer}
              onClick={handleConfirm}
            >
              {i18n.translate("add_to_cart")}
            </s-button>

            <s-button variant="secondary" onClick={rescan}>
              {i18n.translate("cancel")}
            </s-button>
          </s-stack>
        </s-scroll-box>
      </s-page>
    );
  }

  if (status === "success") {
    return (
      <s-page heading={i18n.translate("modal_heading")}>
        <s-scroll-box>
          <s-stack direction="block" gap="small">
            <s-banner heading={i18n.translate("added_banner")} tone="success" />

            <s-text>{message}</s-text>

            <s-button onClick={rescan}>
              {i18n.translate("scan_another")}
            </s-button>
          </s-stack>
        </s-scroll-box>
      </s-page>
    );
  }

  if (status === "error") {
    return (
      <s-page heading={i18n.translate("modal_heading")}>
        <s-scroll-box>
          <s-stack direction="block" gap="small">
            <s-banner heading={message} tone="critical" />

            <s-button onClick={rescan}>{i18n.translate("try_again")}</s-button>
          </s-stack>
        </s-scroll-box>
      </s-page>
    );
  }

  return (
    <s-page heading={i18n.translate("modal_heading")}>
      <s-scroll-box>
        <s-box padding="small">
          <s-text>{i18n.translate("scan_prompt")}</s-text>
        </s-box>
      </s-scroll-box>
    </s-page>
  );
}

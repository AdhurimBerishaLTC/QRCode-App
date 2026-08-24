import "@shopify/ui-extensions/preact";
import { render } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
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
  const [status, setStatus] = useState("scanning");
  const [message, setMessage] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [pendingItem, setPendingItem] = useState(
    /** @type {PendingItem | null} */ (null),
  );
  const lastScanned = useRef("");

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

  const handleConfirm = async () => {
    if (!pendingItem) return;
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

            <s-stack direction="inline" gap="small">
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
              {shopify.i18n.translate("currency")}
              {pendingItem?.price}
            </s-text>

            <s-button variant="primary" onClick={handleConfirm}>
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

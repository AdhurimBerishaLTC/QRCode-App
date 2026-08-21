import "@shopify/ui-extensions/preact";
import { render } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import {
  fetchQrCode,
  parseQrHandle,
  variantNumericId,
} from "./FetchQrCode";

/**
 * @typedef {"scanning" | "loading" | "success" | "error"} RedeemStatus
 * @typedef {{ data?: string }} ScanResult
 */

export default async () => {
  render(<Modal />, document.body);
};

/**
 * @returns {typeof shopify.scanner & { showCameraScanner: () => void; hideCameraScanner: () => void }}
 */
function cameraScanner() {
  return /** @type {typeof shopify.scanner & { showCameraScanner: () => void; hideCameraScanner: () => void }} */ (
    shopify.scanner
  );
}

function Modal() {
  const { i18n } = shopify;
  const scanner = cameraScanner();
  const [status, setStatus] = useState(
    /** @type {RedeemStatus} */ ("scanning"),
  );
  const [message, setMessage] = useState("");
  const lastScanned = useRef("");

  useEffect(() => {
    scanner.showCameraScanner();

    const unsubscribe = scanner.scannerData.current.subscribe(
      async (/** @type {ScanResult} */ scan) => {
        if (!scan.data || scan.data === lastScanned.current) {
          return;
        }
        lastScanned.current = scan.data;

        setStatus("loading");
        scanner.hideCameraScanner();

        if (!shopify.cart.current.value.customer) {
          setMessage(i18n.translate("needs_customer"));
          setStatus("error");
          return;
        }

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

          const uuid = await shopify.cart.addLineItem(variantId, 1);
          if (!uuid) {
            setMessage(i18n.translate("add_failed"));
            setStatus("error");
            return;
          }
          await shopify.cart.addLineItemProperties(uuid, {
            src: "qr",
            qr_code: handle,
          });
          await shopify.cart.addCartProperties({
            src: "qr",
            qr_code: handle,
          });

          setMessage(
            metaobject.product?.reference?.title ||
              metaobject.title?.jsonValue ||
              i18n.translate("product_added"),
          );
          setStatus("success");
          shopify.toast.show(i18n.translate("added_toast"));
        } catch {
          setMessage(i18n.translate("add_failed"));
          setStatus("error");
        }
      },
    );

    return () => {
      unsubscribe();
      scanner.hideCameraScanner();
    };
  }, []);

  const rescan = () => {
    lastScanned.current = "";
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

  if (status === "success") {
    return (
      <s-page heading={i18n.translate("modal_heading")}>
        <s-scroll-box>
          <s-stack direction="block" gap="small">
            <s-banner heading={i18n.translate("added_banner")} tone="success" />
            <s-text>{message}</s-text>
            <s-button onClick={rescan}>{i18n.translate("scan_another")}</s-button>
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

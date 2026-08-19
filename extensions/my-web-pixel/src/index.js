import { register } from "@shopify/web-pixels-extension";

const QR_COOKIE = "_qr_code";
const FUNNEL_STEPS = {
  page_viewed: "landed",
  product_viewed: "viewed",
  product_added_to_cart: "added_to_cart",
  checkout_started: "checkout_started",
  checkout_completed: "purchased",
};

const searchParams = (search) =>
  new URLSearchParams((search || "").replace(/^\?/, ""));

const attributeValue = (attributes, key) => {
  if (!Array.isArray(attributes)) return "";
  const match = attributes.find((attribute) => attribute?.key === key);
  return match?.value || "";
};

const handleFromSearch = (search) => {
  const params = searchParams(search);
  if (params.get("src") !== "qr") return "";
  return params.get("qr") || "";
};

const handleFromAttributes = (attributes) =>
  attributeValue(attributes, "qr_code") ||
  (attributeValue(attributes, "src") === "qr" ? "qr" : "");

register(async ({ analytics, browser, settings, init }) => {
  const endpoint = settings.endpoint;
  if (!endpoint) {
    console.warn(
      "web pixel: missing endpoint setting. Open the app in Shopify admin to sync it.",
    );
    return;
  }

  const bootHandle =
    handleFromSearch(init.context?.document?.location?.search) ||
    handleFromAttributes(init.data?.cart?.attributes);
  if (bootHandle && bootHandle !== "qr") {
    await browser.cookie.set(QR_COOKIE, bootHandle);
  }

  const send = async (event) => {
    const step = FUNNEL_STEPS[event.name];
    if (!step) return;

    const fromUrl = handleFromSearch(event.context?.document?.location?.search);
    const fromCheckout = handleFromAttributes(event.data?.checkout?.attributes);
    const fromCart = handleFromAttributes(
      event.data?.cart?.attributes || init.data?.cart?.attributes,
    );

    if (fromUrl && fromUrl !== "qr") {
      await browser.cookie.set(QR_COOKIE, fromUrl);
    }

    const qrHandle =
      (fromUrl !== "qr" && fromUrl) ||
      (fromCheckout !== "qr" && fromCheckout) ||
      (fromCart !== "qr" && fromCart) ||
      (await browser.cookie.get(QR_COOKIE)) ||
      fromUrl ||
      fromCheckout ||
      fromCart;

    if (!qrHandle) return;
    if (event.name === "page_viewed" && !fromUrl) return;

    const location = event.context?.document?.location;
    fetch(endpoint, {
      method: "POST",
      body: JSON.stringify({
        accountID: settings.accountID,
        shop: init.data?.shop?.myshopifyDomain || "",
        step,
        qrHandle,
        name: event.name,
        id: event.id,
        timestamp: event.timestamp,
        clientId: event.clientId,
        href: location?.href,
        pathname: location?.pathname,
        search: location?.search,
        title: event.context?.document?.title,
        data: event.data,
      }),
      keepalive: true,
    });
  };

  await Promise.all(
    Object.keys(FUNNEL_STEPS).map((name) => analytics.subscribe(name, send)),
  );
});

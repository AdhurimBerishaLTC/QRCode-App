import { register } from "@shopify/web-pixels-extension";

register(async ({ analytics, browser, settings }) => {
  console.log("accountID", settings.accountID);

  const uid = await browser.cookie.get("your_visitor_cookie");
  const endpoint = settings.endpoint;

  if (!endpoint) {
    console.warn(
      "web pixel: missing endpoint setting. Open the app in Shopify admin to sync it.",
    );
    return;
  }

  analytics.subscribe("all_events", (event) => {
    const location = event.context?.document?.location;

    fetch(endpoint, {
      method: "POST",
      body: JSON.stringify({
        accountID: settings.accountID,
        uid,
        name: event.name,
        id: event.id,
        timestamp: event.timestamp,
        clientId: event.clientId,
        href: location?.href,
        pathname: location?.pathname,
        search: location?.search,
        title: event.context?.document?.title,
        referrer: event.context?.document?.referrer,
        data: event.data,
      }),
      keepalive: true,
    });
  });
});

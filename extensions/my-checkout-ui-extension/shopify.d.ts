import '@shopify/ui-extensions';

//@ts-ignore
declare module './src/Checkout.jsx' {
  const shopify: import('@shopify/ui-extensions/purchase.checkout.block.render').Api;
  const globalThis: { shopify: typeof shopify };
}

//@ts-ignore
declare module './src/ThankYouPageSurvey.jsx' {
  const shopify: import('@shopify/ui-extensions/purchase.thank-you.customer-information.render-after').Api;
  const globalThis: { shopify: typeof shopify };
}

//@ts-ignore
declare module './src/OrderStatusPageSurvey.jsx' {
  const shopify: import('@shopify/ui-extensions/customer-account.order-status.customer-information.render-after').Api;
  const globalThis: { shopify: typeof shopify };
}

//@ts-ignore
declare module './src/DeliveryInstructions.jsx' {
  const shopify: import('@shopify/ui-extensions/purchase.checkout.block.render').Api;
  const globalThis: { shopify: typeof shopify };
}

//@ts-ignore
declare module './src/shared.jsx' {
  const shopify:
    | import('@shopify/ui-extensions/purchase.thank-you.customer-information.render-after').Api
    | import('@shopify/ui-extensions/customer-account.order-status.customer-information.render-after').Api;
  const globalThis: { shopify: typeof shopify };
}

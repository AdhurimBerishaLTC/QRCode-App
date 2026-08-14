// @ts-check

/**
 * @typedef {import("../generated/api").CartPaymentMethodsTransformRunInput} CartPaymentMethodsTransformRunInput
 * @typedef {import("../generated/api").CartPaymentMethodsTransformRunResult} CartPaymentMethodsTransformRunResult
 */

const NO_CHANGES = { operations: [] };

const DEFAULTS = {
  cartTotal: 100,
  paymentMethodName: "Cash on Delivery",
};

/**
 * @param {CartPaymentMethodsTransformRunInput} input
 * @returns {CartPaymentMethodsTransformRunResult}
 */
export function cartPaymentMethodsTransformRun(input) {
  const config = input.paymentCustomization.metafield?.jsonValue ?? DEFAULTS;

  const cartTotal = parseFloat(input.cart.cost.totalAmount.amount ?? "0.0");
  if (!(cartTotal > config.cartTotal)) {
    return NO_CHANGES;
  }

  const hidePaymentMethod = input.paymentMethods.find((method) =>
    method.name.includes(config.paymentMethodName),
  );
  if (!hidePaymentMethod) {
    return NO_CHANGES;
  }

  return {
    operations: [
      {
        paymentMethodHide: {
          paymentMethodId: hidePaymentMethod.id,
        },
      },
    ],
  };
}

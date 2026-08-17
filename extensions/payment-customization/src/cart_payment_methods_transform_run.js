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

const PAYMENT_METHOD_ALIASES = {
  "credit card": ["credit card", "credit/debit", "bogus gateway"],
};

/**
 * @param {string} methodName
 * @param {string} configuredName
 */
function matchesConfiguredMethod(methodName, configuredName) {
  const method = String(methodName ?? "").toLowerCase();
  const configured = String(configuredName ?? "").toLowerCase().trim();
  if (!configured) {
    return false;
  }
  if (method.includes(configured)) {
    return true;
  }

  const aliases = PAYMENT_METHOD_ALIASES[configured] ?? [];
  return aliases.some((alias) => method.includes(alias));
}

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
    matchesConfiguredMethod(method.name, config.paymentMethodName),
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

// @ts-check

/**
 * @typedef {import("../generated/api").CartValidationsGenerateRunInput} CartValidationsGenerateRunInput
 * @typedef {import("../generated/api").CartValidationsGenerateRunResult} CartValidationsGenerateRunResult
 */

const SHOP_MAX_SUBTOTAL = 1000;
const MIN_ESTABLISHED_ORDERS = 5;

/**
 * @param {CartValidationsGenerateRunInput} input
 * @returns {string}
 */
function languageCode(input) {
  return String(input.localization?.language?.isoCode ?? "EN").toUpperCase();
}

/**
 * @param {CartValidationsGenerateRunInput} input
 * @returns {number}
 */
function presentmentRate(input) {
  const rate = parseFloat(input.presentmentCurrencyRate ?? "1");
  return Number.isFinite(rate) && rate > 0 ? rate : 1;
}

/**
 * @param {string} language
 * @param {number} amount
 * @param {string} currencyCode
 * @returns {string}
 */
function maxSubtotalMessage(language, amount, currencyCode) {
  const formatted = Number.isInteger(amount)
    ? String(amount)
    : amount.toFixed(2);
  if (language === "FR") {
    return `Le montant maximum de commande est de ${formatted} ${currencyCode} pour les clients sans historique de commandes établi`;
  }
  return `There's an order maximum of ${formatted} ${currencyCode} for customers without established order history`;
}

/**
 * @param {CartValidationsGenerateRunInput} input
 * @returns {CartValidationsGenerateRunResult}
 */
export function cartValidationsGenerateRun(input) {
  const orderSubtotal = parseFloat(input.cart.cost.subtotalAmount.amount);
  const maxSubtotal = SHOP_MAX_SUBTOTAL * presentmentRate(input);
  const errors = [];

  if (orderSubtotal > maxSubtotal) {
    const numberOfOrders =
      input.cart.buyerIdentity?.customer?.numberOfOrders ?? 0;

    if (numberOfOrders < MIN_ESTABLISHED_ORDERS) {
      errors.push({
        message: maxSubtotalMessage(
          languageCode(input),
          maxSubtotal,
          input.cart.cost.subtotalAmount.currencyCode ?? "USD",
        ),
        target: "$.cart",
      });
    }
  }

  return {
    operations: [
      {
        validationAdd: {
          errors,
        },
      },
    ],
  };
}

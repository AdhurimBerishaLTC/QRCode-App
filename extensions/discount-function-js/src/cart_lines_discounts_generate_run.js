import {
  DiscountClass,
  OrderDiscountSelectionStrategy,
} from "../generated/api";

/**
 * @typedef {import("../generated/api").CartInput} RunInput
 * @typedef {import("../generated/api").CartLinesDiscountsGenerateRunResult} CartLinesDiscountsGenerateRunResult
 */

const DEFAULT_ORDER_PERCENT = 10;

/**
 * @param {{ jsonValue?: { orderPercent?: number } | null } | null | undefined} metafield
 * @returns {number}
 */
function getOrderPercent(metafield) {
  const value = metafield?.jsonValue?.orderPercent;
  return typeof value === "number" && value > 0 ? value : DEFAULT_ORDER_PERCENT;
}

/**
 * @param {RunInput} input
 * @returns {CartLinesDiscountsGenerateRunResult}
 */
export function cartLinesDiscountsGenerateRun(input) {
  const src = input.cart.attribute?.value;
  if (src !== "qr") {
    return { operations: [] };
  }

  const customer = input.cart.buyerIdentity?.customer;
  if (!customer || customer.qrDiscountRedeemed?.jsonValue === true) {
    return { operations: [] };
  }

  if (!input.cart.lines.length) {
    return { operations: [] };
  }

  const hasOrderDiscountClass = input.discount.discountClasses.includes(
    DiscountClass.Order,
  );
  if (!hasOrderDiscountClass) {
    return { operations: [] };
  }

  const orderPercent = getOrderPercent(input.discount.metafield);

  return {
    operations: [
      {
        orderDiscountsAdd: {
          candidates: [
            {
              message: `QR SCAN — ${orderPercent}% OFF`,
              targets: [
                {
                  orderSubtotal: {
                    excludedCartLineIds: [],
                  },
                },
              ],
              value: {
                percentage: {
                  value: orderPercent,
                },
              },
            },
          ],
          selectionStrategy: OrderDiscountSelectionStrategy.First,
        },
      },
    ],
  };
}

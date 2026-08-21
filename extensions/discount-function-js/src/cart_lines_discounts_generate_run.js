import {
  DiscountClass,
  OrderDiscountSelectionStrategy,
} from "../generated/api";
import { languageCode, orderDiscountMessage } from "./localization";
import { isQrDiscountBlocked, isQrScan } from "./qrEligibility";

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
  if (!isQrScan(input.cart)) {
    return { operations: [] };
  }

  const customer = input.cart.buyerIdentity?.customer;
  if (!customer) {
    return { operations: [] };
  }

  if (isQrDiscountBlocked(input.cart)) {
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
              message: orderDiscountMessage(languageCode(input), orderPercent),
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

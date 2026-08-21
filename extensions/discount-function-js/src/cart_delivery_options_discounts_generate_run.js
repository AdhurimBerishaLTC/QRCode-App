import {
  DeliveryDiscountSelectionStrategy,
  DiscountClass,
} from "../generated/api";
import { freeShippingMessage, languageCode } from "./localization";
import { isQrDiscountBlocked, isQrScan } from "./qrEligibility";

/**
 * @typedef {import("../generated/api").DeliveryInput} RunInput
 * @typedef {import("../generated/api").CartDeliveryOptionsDiscountsGenerateRunResult} CartDeliveryOptionsDiscountsGenerateRunResult
 */

/**
 * @param {{ jsonValue?: { freeShipping?: boolean } | null } | null | undefined} metafield
 * @returns {boolean}
 */
function isFreeShippingEnabled(metafield) {
  return metafield?.jsonValue?.freeShipping !== false;
}

/**
 * @param {RunInput} input
 * @returns {CartDeliveryOptionsDiscountsGenerateRunResult}
 */
export function cartDeliveryOptionsDiscountsGenerateRun(input) {
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

  if (!isFreeShippingEnabled(input.discount.metafield)) {
    return { operations: [] };
  }

  const firstDeliveryGroup = input.cart.deliveryGroups[0];
  if (!firstDeliveryGroup) {
    return { operations: [] };
  }

  const hasShippingDiscountClass = input.discount.discountClasses.includes(
    DiscountClass.Shipping,
  );
  if (!hasShippingDiscountClass) {
    return { operations: [] };
  }

  return {
    operations: [
      {
        deliveryDiscountsAdd: {
          candidates: [
            {
              message: freeShippingMessage(languageCode(input)),
              targets: [
                {
                  deliveryGroup: {
                    id: firstDeliveryGroup.id,
                  },
                },
              ],
              value: {
                percentage: {
                  value: 100,
                },
              },
            },
          ],
          selectionStrategy: DeliveryDiscountSelectionStrategy.All,
        },
      },
    ],
  };
}

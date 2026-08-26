import {
  DeliveryDiscountSelectionStrategy,
  DiscountClass,
} from "../generated/api";
import { passesDiscountEligibility } from "./qrEligibility";
import { parseFunctionConfiguration } from "./parseFunctionConfiguration";
import { deliveryDiscountMessage, languageCode } from "./localization";

/**
 * @typedef {import("../generated/api").DeliveryInput} RunInput
 * @typedef {import("../generated/api").CartDeliveryOptionsDiscountsGenerateRunResult} CartDeliveryOptionsDiscountsGenerateRunResult
 */

/**
 * @param {RunInput} input
 * @returns {CartDeliveryOptionsDiscountsGenerateRunResult}
 */
export function cartDeliveryOptionsDiscountsGenerateRun(input) {
  const config = parseFunctionConfiguration(input.discount.metafield);

  if (!passesDiscountEligibility(input.cart, config)) {
    return { operations: [] };
  }

  const firstDeliveryGroup = input.cart.deliveryGroups[0];
  if (!firstDeliveryGroup) {
    return { operations: [] };
  }

  const { deliveryPercentage } = config;
  const language = languageCode(input);

  const hasShippingDiscountClass = input.discount.discountClasses.includes(
    DiscountClass.Shipping,
  );
  if (!hasShippingDiscountClass) {
    return { operations: [] };
  }

  const operations = [];

  if (hasShippingDiscountClass && deliveryPercentage > 0) {
    operations.push({
      deliveryDiscountsAdd: {
        candidates: [
          {
            message: deliveryDiscountMessage(language, deliveryPercentage),
            targets: [
              {
                deliveryGroup: {
                  id: firstDeliveryGroup.id,
                },
              },
            ],
            value: {
              percentage: {
                value: deliveryPercentage,
              },
            },
          },
        ],
        selectionStrategy: DeliveryDiscountSelectionStrategy.All,
      },
    });
  }

  return { operations };
}

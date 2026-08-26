import {
  OrderDiscountSelectionStrategy,
  ProductDiscountSelectionStrategy,
  DiscountClass,
} from "../generated/api";

import { passesDiscountEligibility } from "./qrEligibility";
import { parseFunctionConfiguration } from "./parseFunctionConfiguration";
import {
  languageCode,
  orderDiscountMessage,
  productDiscountMessage,
} from "./localization";

/**
 * @typedef {import("../generated/api").CartInput} RunInput
 * @typedef {import("../generated/api").CartLinesDiscountsGenerateRunResult} CartLinesDiscountsGenerateRunResult
 */

/**
 * @param {RunInput} input
 * @returns {CartLinesDiscountsGenerateRunResult}
 */
export function cartLinesDiscountsGenerateRun(input) {
  const config = parseFunctionConfiguration(input.discount.metafield);

  if (!passesDiscountEligibility(input.cart, config)) {
    return { operations: [] };
  }

  if (!input.cart.lines.length) {
    return { operations: [] };
  }

  const { cartLinePercentage, orderPercentage, collectionIds } = config;
  const language = languageCode(input);

  const hasOrderDiscountClass = input.discount.discountClasses.includes(
    DiscountClass.Order,
  );
  const hasProductDiscountClass = input.discount.discountClasses.includes(
    DiscountClass.Product,
  );

  if (!hasOrderDiscountClass && !hasProductDiscountClass) {
    return { operations: [] };
  }

  const operations = [];

  // Add product discounts first if available and allowed
  if (hasProductDiscountClass && cartLinePercentage > 0) {
    const cartLineTargets = input.cart.lines.reduce((targets, line) => {
      if (
        "product" in line.merchandise &&
        (line.merchandise.product.inAnyCollection || collectionIds.length === 0)
      ) {
        targets.push({
          cartLine: {
            id: line.id,
          },
        });
      }
      return targets;
    }, []);

    if (cartLineTargets.length > 0) {
      operations.push({
        productDiscountsAdd: {
          candidates: [
            {
              message: productDiscountMessage(language, cartLinePercentage),
              targets: cartLineTargets,
              value: {
                percentage: {
                  value: cartLinePercentage,
                },
              },
            },
          ],
          selectionStrategy: ProductDiscountSelectionStrategy.First,
        },
      });
    }
  }

  // Then add order discounts if available and allowed
  if (hasOrderDiscountClass && orderPercentage > 0) {
    operations.push({
      orderDiscountsAdd: {
        candidates: [
          {
            message: orderDiscountMessage(language, orderPercentage),
            targets: [
              {
                orderSubtotal: {
                  excludedCartLineIds: [],
                },
              },
            ],
            value: {
              percentage: {
                value: orderPercentage,
              },
            },
          },
        ],
        selectionStrategy: OrderDiscountSelectionStrategy.First,
      },
    });
  }

  return { operations };
}

// @ts-check

/**
 * @typedef {import("../generated/api").CartTransformRunInput} CartTransformRunInput
 * @typedef {import("../generated/api").CartTransformRunResult} CartTransformRunResult
 */

/**
 * @type {CartTransformRunResult}
 */
const NO_CHANGES = {
  operations: [],
};

/**
 * @param {CartTransformRunInput} input
 * @returns {CartTransformRunResult}
 */
export function cartTransformRun(input) {
  const operations = [];

  for (const line of input.cart.lines) {
    const merchandise = line.merchandise;

    // Only ProductVariant can have the component_reference metafield
    if (merchandise.__typename !== "ProductVariant") {
      continue;
    }

    const componentReference = merchandise.component_reference;

    // This product is not a bundle
    if (!componentReference) {
      continue;
    }

    /** @type {string[]} */
    const componentReferences = componentReference.jsonValue;

    // No components found
    if (!componentReferences || componentReferences.length === 0) {
      continue;
    }

    // Create an expanded item for every component
    const expandedCartItems = componentReferences.map((merchandiseId) => ({
      merchandiseId,
      quantity: 1,
    }));

    // Create the expand operation
    operations.push({
      lineExpand: {
        cartLineId: line.id,
        expandedCartItems,
      },
    });
  }

  if (operations.length === 0) {
    return NO_CHANGES;
  }

  return {
    operations,
  };
}

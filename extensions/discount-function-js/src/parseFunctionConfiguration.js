/**
 * @param {{ value?: string } | null | undefined} metafield
 */
export function parseFunctionConfiguration(metafield) {
  const empty = {
    cartLinePercentage: 0,
    orderPercentage: 0,
    deliveryPercentage: 0,
    collectionIds: [],
    requireQrScan: false,
  };

  if (!metafield?.value) {
    return empty;
  }

  try {
    const value = JSON.parse(metafield.value);
    const deliveryPercentage =
      value.deliveryPercentage ??
      (value.freeShipping === false ? 0 : value.freeShipping ? 100 : 0);

    return {
      cartLinePercentage: Number(value.cartLinePercentage) || 0,
      orderPercentage: Number(value.orderPercentage ?? value.orderPercent) || 0,
      deliveryPercentage: Number(deliveryPercentage) || 0,
      collectionIds: value.collectionIds ?? [],
      requireQrScan: value.requireQrScan === true,
    };
  } catch (error) {
    console.error("Error parsing metafield", error);
    return empty;
  }
}

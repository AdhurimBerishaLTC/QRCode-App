import { getVariantsCount } from "../utils";

/**
 * @typedef {import("@shopify/ui-extensions/admin.product-details.block.render").Api} BlockApi
 */

export default async function extension() {
  const { data } = /** @type {BlockApi} */ (
    /** @type {any} */ (globalThis).shopify
  );
  const variantCount = await getVariantsCount(data.selected[0].id);
  return { display: variantCount > 1 };
}

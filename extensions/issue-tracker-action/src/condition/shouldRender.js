import { getVariantsCount } from "../utils";

export default async function extension() {
  const { data } = shopify;
  const variantCount = await getVariantsCount(data.selected[0].id);
  return { display: variantCount > 1 };
}

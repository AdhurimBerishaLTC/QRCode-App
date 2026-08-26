import "@shopify/ui-extensions/preact";
import { render } from "preact";
import { useEffect, useState } from "preact/hooks";

/**
 * @typedef {{
 *   id: string,
 *   title: string,
 *   onlineStoreUrl?: string | null,
 *   priceRange: {
 *     minVariantPrice: {
 *       amount: string,
 *       currencyCode: string,
 *     },
 *   },
 *   featuredImage?: { url: string } | null,
 * }} WishlistProduct
 */

export default async () => {
  render(<FullPageExtension />, document.body);
};

function FullPageExtension() {
  /** @type {[WishlistProduct[], (value: WishlistProduct[]) => void]} */
  const [wishlist, setWishlist] = useState(
    /** @type {WishlistProduct[]} */ ([]),
  );
  const [loading, setLoading] = useState(false);
  const [removeLoading, setRemoveLoading] = useState(
    /** @type {{ id: string | null, loading: boolean }} */ ({
      id: null,
      loading: false,
    }),
  );

  async function fetchWishlist() {
    setLoading(true);

    try {
      // Implement a server request to retrieve the wishlist for this customer
      // Then call the Storefront API to retrieve the details of the wishlisted products
      const data = await shopify.query(
        `query ($first: Int!) {
          products(first: $first) {
            nodes {
              id
              title
              onlineStoreUrl
              priceRange {
                minVariantPrice {
                  amount
                  currencyCode
                }
              }
              featuredImage {
                url
              }
            }
          }
        }`,
        {
          variables: { first: 10 },
        },
      );
      setLoading(false);
      const nodes =
        /** @type {{ data?: { products?: { nodes?: WishlistProduct[] } } }} */ (
          data
        ).data?.products?.nodes || [];
      setWishlist(nodes);
    } catch (error) {
      setLoading(false);
      console.log(error);
    }
  }

  /**
   * @param {string} id
   */
  async function deleteWishlistItem(id) {
    // Simulate a server request
    setRemoveLoading({ loading: true, id });
    setTimeout(() => {
      // Send a request to your server to delete the wishlist item
      setWishlist(wishlist.filter((item) => item.id !== id));

      setRemoveLoading({ loading: false, id: null });
    }, 750);
  }

  useEffect(() => {
    fetchWishlist();
  }, []);

  return (
    <s-page heading="Wishlist">
      <s-grid gridTemplateColumns="1fr 1fr 1fr" gap="base">
        {!loading &&
          wishlist.length > 0 &&
          wishlist.map((product) => {
            return (
              <s-section key={product.id}>
                <s-stack direction="block" gap="base" paddingBlockEnd="large">
                  <s-image src={product.featuredImage?.url} />
                  <s-stack direction="block" gap="small-500">
                    <s-text color="subdued">{product.title}</s-text>
                    <s-text type="strong">
                      {shopify.i18n.formatCurrency(
                        Number(product.priceRange.minVariantPrice.amount),
                        {
                          currency:
                            product.priceRange.minVariantPrice.currencyCode,
                        },
                      )}
                    </s-text>
                  </s-stack>
                </s-stack>
                <s-button
                  slot="primary-action"
                  href={product.onlineStoreUrl ?? undefined}
                >
                  View product
                </s-button>
                <s-button
                  slot="secondary-actions"
                  loading={
                    removeLoading.loading && product.id === removeLoading.id
                  }
                  onClick={() => {
                    deleteWishlistItem(product.id);
                  }}
                >
                  Remove
                </s-button>
              </s-section>
            );
          })}
        {!loading && wishlist.length === 0 && (
          <s-text>No items in your wishlist.</s-text>
        )}
      </s-grid>
    </s-page>
  );
}

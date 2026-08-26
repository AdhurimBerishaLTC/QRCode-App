import "@shopify/ui-extensions/preact";
import { render } from "preact";
import PropTypes from "prop-types";

export default async () => {
  let hasFulfillments = false;

  try {
    const orderQuery = {
      query: `query Order($orderId: ID!) {
        order(id: $orderId) {
          fulfillments(first: 1) {
            nodes {
              latestShipmentStatus
            }
          }
        }
      }`,
      variables: { orderId: shopify.orderId },
    };

    const result = await fetch(
      "shopify://customer-account/api/2025-10/graphql.json",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderQuery),
      },
    );

    const { data } = await result.json();

    hasFulfillments = data.order.fulfillments.nodes.length !== 0;
  } catch (error) {
    console.log(error);
    hasFulfillments = false;
  }
  render(<MenuActionExtension showAction={hasFulfillments} />, document.body);
};

/**
 * @param {{ showAction: boolean }} props
 */
function MenuActionExtension({ showAction }) {
  if (!showAction) {
    return null;
  }

  return <s-button>Report a problem</s-button>;
}

MenuActionExtension.propTypes = {
  showAction: PropTypes.bool.isRequired,
};

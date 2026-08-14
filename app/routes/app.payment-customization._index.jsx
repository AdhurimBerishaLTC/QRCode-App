import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";

export const FUNCTION_HANDLE = "payment-customization";

export const createPaymentCustomizationPath = () =>
  `/app/payment-customization/${FUNCTION_HANDLE}/new`;

export const editPaymentCustomizationPath = (id) => {
  const numericId = String(id).split("/").pop();
  return `/app/payment-customization/${FUNCTION_HANDLE}/${numericId}`;
};

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const response = await admin.graphql(
    `#graphql
      query PaymentCustomizations {
        paymentCustomizations(first: 25) {
          nodes {
            id
            title
            enabled
            metafield(namespace: "$app:payment-customization", key: "function-configuration") {
              jsonValue
            }
          }
        }
      }`,
  );

  const responseJson = await response.json();
  const customizations =
    responseJson.data?.paymentCustomizations?.nodes ?? [];

  return { customizations };
};

export default function PaymentCustomizationsIndex() {
  const { customizations } = useLoaderData();

  return (
    <s-page heading="Hide payment method">
      <s-link slot="primary-actions" href={createPaymentCustomizationPath()}>
        Create customization
      </s-link>
      {customizations.length === 0 ? (
        <s-section>
          <s-paragraph>
            Hide a payment method at checkout when the cart total is over a
            threshold. Create a customization to get started.
          </s-paragraph>
        </s-section>
      ) : (
        <s-section padding="none" accessibilityLabel="Payment customizations">
          <s-table>
            <s-table-header-row>
              <s-table-header listSlot="primary">Title</s-table-header>
              <s-table-header>Payment method</s-table-header>
              <s-table-header>Cart total</s-table-header>
              <s-table-header>Status</s-table-header>
            </s-table-header-row>
            <s-table-body>
              {customizations.map((customization) => {
                const config = customization.metafield?.jsonValue ?? {};
                return (
                  <s-table-row key={customization.id} id={customization.id}>
                    <s-table-cell>
                      <s-link href={editPaymentCustomizationPath(customization.id)}>
                        {customization.title}
                      </s-link>
                    </s-table-cell>
                    <s-table-cell>
                      {config.paymentMethodName ?? "—"}
                    </s-table-cell>
                    <s-table-cell>
                      {config.cartTotal != null ? `$${config.cartTotal}` : "—"}
                    </s-table-cell>
                    <s-table-cell>
                      {customization.enabled ? "Enabled" : "Disabled"}
                    </s-table-cell>
                  </s-table-row>
                );
              })}
            </s-table-body>
          </s-table>
        </s-section>
      )}
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};

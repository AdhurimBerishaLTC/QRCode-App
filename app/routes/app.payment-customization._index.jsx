import { useFetcher, useLoaderData } from "react-router";
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

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const id = String(formData.get("id") ?? "");
  const enabled = String(formData.get("enabled")) === "true";

  if (!id) {
    return { errors: [{ message: "Missing payment customization." }] };
  }

  const response = await admin.graphql(
    `#graphql
      mutation paymentCustomizationActivation($ids: [ID!]!, $enabled: Boolean!) {
        paymentCustomizationActivation(ids: $ids, enabled: $enabled) {
          ids
          userErrors {
            message
          }
        }
      }`,
    {
      variables: {
        ids: [id],
        enabled,
      },
    },
  );

  const responseJson = await response.json();
  const errors =
    responseJson.data?.paymentCustomizationActivation?.userErrors ?? [];

  return { errors };
};

export default function PaymentCustomizationsIndex() {
  const { customizations } = useLoaderData();
  const fetcher = useFetcher();
  const errors = fetcher.data?.errors ?? [];
  const pendingId = fetcher.formData?.get("id");
  const pendingEnabled = String(fetcher.formData?.get("enabled")) === "true";
  const isSubmitting = fetcher.state !== "idle";

  return (
    <s-page heading="Hide payment method">
      <s-link slot="primary-actions" href={createPaymentCustomizationPath()}>
        Create customization
      </s-link>
      {errors.length > 0 ? (
        <s-banner tone="critical" heading="Couldn't update the customization.">
          {errors.map((error, index) => (
            <s-paragraph key={index}>{error.message}</s-paragraph>
          ))}
        </s-banner>
      ) : null}
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
              <s-table-header>Enabled</s-table-header>
            </s-table-header-row>
            <s-table-body>
              {customizations.map((customization) => {
                const config = customization.metafield?.jsonValue ?? {};
                const enabled =
                  pendingId === customization.id
                    ? pendingEnabled
                    : customization.enabled;
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
                      <s-switch
                        label="Enabled"
                        labelAccessibilityVisibility="exclusive"
                        checked={enabled}
                        disabled={isSubmitting && pendingId === customization.id}
                        onChange={(event) => {
                          fetcher.submit(
                            {
                              id: customization.id,
                              enabled: event.currentTarget.checked
                                ? "true"
                                : "false",
                            },
                            { method: "post" },
                          );
                        }}
                      ></s-switch>
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

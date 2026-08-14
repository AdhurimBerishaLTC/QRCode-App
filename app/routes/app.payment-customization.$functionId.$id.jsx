import { useEffect, useState } from "react";
import {
  useActionData,
  useLoaderData,
  useNavigate,
  useNavigation,
  useSubmit,
} from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";

const METAFIELD_NAMESPACE = "$app:payment-customization";
const METAFIELD_KEY = "function-configuration";

function paymentCustomizationGid(id) {
  return id.startsWith("gid://")
    ? id
    : `gid://shopify/PaymentCustomization/${id}`;
}

export const loader = async ({ params, request }) => {
  const { id } = params;
  const { admin } = await authenticate.admin(request);

  if (id === "new") {
    return {
      paymentMethodName: "Cash on Delivery",
      cartTotal: "100",
      metafieldId: null,
    };
  }
  const response = await admin.graphql(
    `#graphql
      query getPaymentCustomization($id: ID!) {
        paymentCustomization(id: $id) {
          id
          metafield(namespace: "$app:payment-customization", key: "function-configuration") {
            id
            jsonValue
          }
        }
      }`,
    {
      variables: {
        id: paymentCustomizationGid(id),
      },
    },
  );

  const responseJson = await response.json();
  const metafield = responseJson.data.paymentCustomization?.metafield;
  const config = metafield?.jsonValue ?? {};

  return {
    paymentMethodName: config.paymentMethodName ?? "Cash on Delivery",
    cartTotal: String(config.cartTotal ?? 100),
    metafieldId: metafield?.id ?? null,
  };
};

export const action = async ({ params, request }) => {
  const { functionId, id } = params;
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();

  const paymentMethodName = String(
    formData.get("paymentMethodName") ?? "",
  ).trim();
  const cartTotal = parseFloat(String(formData.get("cartTotal") ?? ""));
  const metafieldId = formData.get("metafieldId");

  if (!paymentMethodName || Number.isNaN(cartTotal) || cartTotal < 0) {
    return {
      errors: [{ message: "Enter a payment method name and a valid cart total." }],
    };
  }

  const metafield = {
    namespace: METAFIELD_NAMESPACE,
    key: METAFIELD_KEY,
    type: "json",
    value: JSON.stringify({
      paymentMethodName,
      cartTotal,
    }),
  };
  if (metafieldId) {
    metafield.id = metafieldId;
  }

  const paymentCustomizationInput = {
    title: `Hide ${paymentMethodName} if cart total is larger than ${cartTotal}`,
    enabled: true,
    metafields: [metafield],
  };

  if (id === "new") {
    paymentCustomizationInput.functionHandle =
      functionId || "payment-customization";
    const response = await admin.graphql(
      `#graphql
        mutation createPaymentCustomization($input: PaymentCustomizationInput!) {
          paymentCustomizationCreate(paymentCustomization: $input) {
            paymentCustomization {
              id
            }
            userErrors {
              message
            }
          }
        }`,
      {
        variables: {
          input: paymentCustomizationInput,
        },
      },
    );

    const responseJson = await response.json();
    const errors = responseJson.data.paymentCustomizationCreate?.userErrors ?? [];
    return { errors };
  }

  const response = await admin.graphql(
    `#graphql
      mutation updatePaymentCustomization($id: ID!, $input: PaymentCustomizationInput!) {
        paymentCustomizationUpdate(id: $id, paymentCustomization: $input) {
          paymentCustomization {
            id
          }
          userErrors {
            message
          }
        }
      }`,
    {
      variables: {
        id: paymentCustomizationGid(id),
        input: paymentCustomizationInput,
      },
    },
  );

  const responseJson = await response.json();
  const errors = responseJson.data.paymentCustomizationUpdate?.userErrors ?? [];
  return { errors };
};

export default function PaymentCustomization() {
  const submit = useSubmit();
  const navigate = useNavigate();
  const actionData = useActionData();
  const navigation = useNavigation();
  const loaderData = useLoaderData();
  const [paymentMethodName, setPaymentMethodName] = useState(
    loaderData.paymentMethodName,
  );
  const [cartTotal, setCartTotal] = useState(loaderData.cartTotal);

  const isLoading = navigation.state === "submitting";
  const errors = actionData?.errors ?? [];

  useEffect(() => {
    if (actionData && errors.length === 0) {
      navigate("/app/payment-customization");
    }
  }, [actionData, errors.length, navigate]);

  const handleSubmit = (event) => {
    event.preventDefault();
    submit(
      {
        paymentMethodName,
        cartTotal,
        metafieldId: loaderData.metafieldId ?? "",
      },
      { method: "post" },
    );
  };

  const handleReset = () => {
    setPaymentMethodName(loaderData.paymentMethodName);
    setCartTotal(loaderData.cartTotal);
  };

  return (
    <form data-save-bar onSubmit={handleSubmit} onReset={handleReset}>
      <s-page heading="Hide payment method">
        <s-link slot="breadcrumb-actions" href="/app/payment-customization">
          Hide payment method
        </s-link>

        {errors.length > 0 ? (
          <s-banner tone="critical" heading="There was an error saving the customization.">
            {errors.map((error, index) => (
              <s-paragraph key={index}>{error.message}</s-paragraph>
            ))}
          </s-banner>
        ) : null}

        <s-section>
          <s-stack gap="base">
            <s-text-field
              name="paymentMethodName"
              label="Payment method"
              details="Must match the checkout name, for example Cash on Delivery"
              value={paymentMethodName}
              onInput={(e) => setPaymentMethodName(e.currentTarget.value)}
              disabled={isLoading}
              autoComplete="off"
              required
            ></s-text-field>
            <s-number-field
              name="cartTotal"
              label="Hide when cart total is greater than"
              value={cartTotal}
              onInput={(e) => setCartTotal(e.currentTarget.value)}
              disabled={isLoading}
              min={0}
              step={0.01}
              required
            ></s-number-field>
          </s-stack>
        </s-section>
      </s-page>
    </form>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};

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
const OTHER_PAYMENT_METHOD = "__other__";
const PAYMENT_METHOD_OPTIONS = [
  "Cash on Delivery",
  "Credit card",
  "(for testing) Bogus Gateway",
  "PayPal",
  "Shopify Payments",
  "Shop Pay",
  "Apple Pay",
  "Google Pay",
];

function paymentMethodSelection(name) {
  return PAYMENT_METHOD_OPTIONS.includes(name)
    ? name
    : OTHER_PAYMENT_METHOD;
}

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
    metafields: [metafield],
  };

  if (id === "new") {
    paymentCustomizationInput.enabled = true;
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
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(
    paymentMethodSelection(loaderData.paymentMethodName),
  );
  const [customPaymentMethodName, setCustomPaymentMethodName] = useState(
    paymentMethodSelection(loaderData.paymentMethodName) === OTHER_PAYMENT_METHOD
      ? loaderData.paymentMethodName
      : "",
  );
  const [cartTotal, setCartTotal] = useState(loaderData.cartTotal);

  const isLoading = navigation.state === "submitting";
  const isOtherPaymentMethod = selectedPaymentMethod === OTHER_PAYMENT_METHOD;
  const errors = actionData?.errors ?? [];

  useEffect(() => {
    if (actionData && errors.length === 0) {
      navigate("/app/payment-customization");
    }
  }, [actionData, errors.length, navigate]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const paymentMethodName = isOtherPaymentMethod
      ? customPaymentMethodName.trim()
      : selectedPaymentMethod;
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
    setSelectedPaymentMethod(paymentMethodSelection(loaderData.paymentMethodName));
    setCustomPaymentMethodName(
      paymentMethodSelection(loaderData.paymentMethodName) === OTHER_PAYMENT_METHOD
        ? loaderData.paymentMethodName
        : "",
    );
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
            <s-select
              label="Payment method"
              details="Must match the checkout name"
              value={selectedPaymentMethod}
              onChange={(e) =>
                setSelectedPaymentMethod(e.currentTarget.value)
              }
              disabled={isLoading}
              required
            >
              {PAYMENT_METHOD_OPTIONS.map((method) => (
                <s-option
                  key={method}
                  value={method}
                  selected={selectedPaymentMethod === method}
                >
                  {method}
                </s-option>
              ))}
              <s-option
                value={OTHER_PAYMENT_METHOD}
                selected={isOtherPaymentMethod}
              >
                Other
              </s-option>
            </s-select>
            {isOtherPaymentMethod ? (
              <s-text-field
                label="Custom payment method name"
                details="Must match the checkout name, for example Cash on Delivery"
                value={customPaymentMethodName}
                onInput={(e) =>
                  setCustomPaymentMethodName(e.currentTarget.value)
                }
                disabled={isLoading}
                autoComplete="off"
                required
              ></s-text-field>
            ) : null}
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

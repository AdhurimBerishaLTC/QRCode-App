import PropTypes from "prop-types";
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { getQRCodes } from "../models/QRCode.server";
import { ensureWebPixelEndpoint } from "../models/webPixel.server";
import { getFunnelStatsByHandle } from "../models/qrFunnel.server";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const [qrCodes, funnelStats] = await Promise.all([
    getQRCodes(admin.graphql, session.shop),
    getFunnelStatsByHandle(session.shop),
  ]);

  try {
    await ensureWebPixelEndpoint(admin.graphql, process.env.SHOPIFY_APP_URL);
  } catch (error) {
    console.error("[web pixel] failed to sync endpoint", error);
  }

  return {
    qrCodes: qrCodes.map((qrCode) => {
      const funnel = funnelStats[qrCode.handle] || {
        viewed: 0,
        addedToCart: 0,
        purchased: 0,
      };
      const scans = qrCode.scans || 0;
      return {
        ...qrCode,
        viewed: funnel.viewed,
        addedToCart: funnel.addedToCart,
        purchased: funnel.purchased,
        conversion:
          scans > 0 ? Math.round((funnel.purchased / scans) * 100) : undefined,
      };
    }),
  };
};

const EmptyQRCodeState = () => (
  <s-section accessibilityLabel="Empty state section">
    <s-grid gap="base" justifyItems="center" paddingBlock="large-400">
      <s-box maxInlineSize="200px" maxBlockSize="200px">
        <s-image
          aspectRatio="1/0.5"
          src="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          alt="A stylized graphic of a document"
        />
      </s-box>
      <s-grid justifyItems="center" maxBlockSize="450px" maxInlineSize="450px">
        <s-heading>Create unique QR codes for your products</s-heading>
        <s-paragraph>
          Allow customers to scan codes and buy products using their phones.
        </s-paragraph>
        <s-stack
          gap="small-200"
          justifyContent="center"
          padding="base"
          paddingBlockEnd="none"
          direction="inline"
        >
          <s-button href="/app/qrcodes/new" variant="primary">
            Create QR code
          </s-button>
        </s-stack>
      </s-grid>
    </s-grid>
  </s-section>
);

function truncate(str, { length = 25 } = {}) {
  if (!str) return "";
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}

const QRTable = ({ qrCodes }) => (
  <s-section padding="none" accessibilityLabel="QRCode table">
    <s-table>
      <s-table-header-row>
        <s-table-header listSlot="primary">Title</s-table-header>
        <s-table-header>Product</s-table-header>
        <s-table-header>Date created</s-table-header>
        <s-table-header>Scans</s-table-header>
        <s-table-header>Viewed</s-table-header>
        <s-table-header>Added to cart</s-table-header>
        <s-table-header>Purchases</s-table-header>
        <s-table-header>Conv.</s-table-header>
      </s-table-header-row>
      <s-table-body>
        {qrCodes.map((qrCode) => (
          <QRTableRow key={qrCode.handle} qrCode={qrCode} />
        ))}
      </s-table-body>
    </s-table>
  </s-section>
);

QRTable.propTypes = {
  qrCodes: PropTypes.arrayOf(
    PropTypes.shape({
      handle: PropTypes.string.isRequired,
    }),
  ).isRequired,
};

const QRTableRow = ({ qrCode }) => (
  <s-table-row id={qrCode.handle}>
    <s-table-cell>
      <s-stack direction="inline" gap="small" alignItems="center">
        <s-clickable
          href={`/app/qrcodes/${qrCode.handle}`}
          accessibilityLabel={`Go to the product page for ${qrCode.productTitle}`}
          border="base"
          borderRadius="base"
          overflow="hidden"
          inlineSize="20px"
          blockSize="20px"
        >
          {qrCode.productImage ? (
            <s-image objectFit="cover" src={qrCode.productImage}></s-image>
          ) : (
            <s-icon size="large" type="image" />
          )}
        </s-clickable>
        <s-link href={`/app/qrcodes/${qrCode.handle}`}>
          {truncate(qrCode.title)}
        </s-link>
      </s-stack>
    </s-table-cell>
    <s-table-cell>
      {qrCode.productDeleted ? (
        <s-badge icon="alert-diamond" tone="critical">
          Product has been deleted
        </s-badge>
      ) : (
        truncate(qrCode.productTitle)
      )}
    </s-table-cell>
    <s-table-cell>{new Date(qrCode.createdAt).toDateString()}</s-table-cell>
    <s-table-cell>{qrCode.scans}</s-table-cell>
    <s-table-cell>{qrCode.viewed}</s-table-cell>
    <s-table-cell>{qrCode.addedToCart}</s-table-cell>
    <s-table-cell>{qrCode.purchased}</s-table-cell>
    <s-table-cell>
      {qrCode.conversion == null ? "—" : `${qrCode.conversion}%`}
    </s-table-cell>
  </s-table-row>
);

QRTableRow.propTypes = {
  qrCode: PropTypes.shape({
    handle: PropTypes.string.isRequired,
    title: PropTypes.string,
    productTitle: PropTypes.string,
    productImage: PropTypes.string,
    productDeleted: PropTypes.bool,
    createdAt: PropTypes.string,
    scans: PropTypes.number,
    viewed: PropTypes.number,
    addedToCart: PropTypes.number,
    purchased: PropTypes.number,
    conversion: PropTypes.number,
  }).isRequired,
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const color = ["Red", "Orange", "Yellow", "Green"][
    Math.floor(Math.random() * 4)
  ];
  const response = await admin.graphql(
    `#graphql
      mutation populateProduct($product: ProductCreateInput!) {
        productCreate(product: $product) {
          product {
            id
            title
            handle
            status
            variants(first: 10) {
              edges {
                node {
                  id
                  price
                  barcode
                  createdAt
                }
              }
            }
            demoInfo: metafield(namespace: "$app", key: "demo_info") {
              jsonValue
            }
          }
        }
      }`,
    {
      variables: {
        product: {
          title: `${color} Snowboard`,
          metafields: [
            {
              namespace: "$app",
              key: "demo_info",
              value: "Created by React Router Template",
            },
          ],
        },
      },
    },
  );
  const responseJson = await response.json();
  const product = responseJson.data.productCreate.product;
  const variantId = product.variants.edges[0].node.id;
  const variantResponse = await admin.graphql(
    `#graphql
    mutation shopifyReactRouterTemplateUpdateVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        productVariants {
          id
          price
          barcode
          createdAt
        }
      }
    }`,
    {
      variables: {
        productId: product.id,
        variants: [{ id: variantId, price: "100.00" }],
      },
    },
  );
  const variantResponseJson = await variantResponse.json();
  const metaobjectResponse = await admin.graphql(
    `#graphql
    mutation shopifyReactRouterTemplateUpsertMetaobject($handle: MetaobjectHandleInput!, $values: JSON!) {
      metaobjectUpsert(handle: $handle, values: $values) {
        metaobject {
          id
          handle
          values
        }
        userErrors {
          field
          message
        }
      }
    }`,
    {
      variables: {
        handle: {
          type: "$app:example",
          handle: "demo-entry",
        },
        values: {
          title: "Demo Entry",
          description:
            "This metaobject was created by the Shopify app template to demonstrate the metaobject API.",
        },
      },
    },
  );
  const metaobjectResponseJson = await metaobjectResponse.json();

  return {
    product: responseJson.data.productCreate.product,
    variant: variantResponseJson.data.productVariantsBulkUpdate.productVariants,
    metaobject: metaobjectResponseJson.data.metaobjectUpsert.metaobject,
  };
};

export default function Index() {
  const { qrCodes } = useLoaderData();
  return (
    <s-page heading="QR codes">
      <s-link slot="secondary-actions" href="/app/qrcodes/new">
        Create QR code
      </s-link>
      {qrCodes.length === 0 ? (
        <EmptyQRCodeState />
      ) : (
        <QRTable qrCodes={qrCodes} />
      )}
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};

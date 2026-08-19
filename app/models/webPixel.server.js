const DEFAULT_ACCOUNT_ID = "123";

const parseSettings = (settings) => {
  if (!settings) return {};
  if (typeof settings === "object") return settings;
  try {
    return JSON.parse(settings);
  } catch {
    return {};
  }
};

export async function ensureWebPixelEndpoint(graphql, appUrl) {
  if (!appUrl) {
    console.warn("[web pixel] SHOPIFY_APP_URL is missing; cannot sync endpoint");
    return null;
  }

  const endpoint = `${String(appUrl).replace(/\/$/, "")}/pixel`;
  const existingResponse = await graphql(
    `#graphql
      query WebPixel {
        webPixel {
          id
          settings
        }
      }`,
  );
  const existingJson = await existingResponse.json();
  const existing = existingJson.data?.webPixel;
  const current = parseSettings(existing?.settings);
  const accountID = current.accountID || DEFAULT_ACCOUNT_ID;
  const settings = { accountID, endpoint };

  if (existing?.id) {
    if (current.endpoint === endpoint && current.accountID === accountID) {
      return existing;
    }

    const updateResponse = await graphql(
      `#graphql
        mutation WebPixelUpdate($id: ID!, $webPixel: WebPixelInput!) {
          webPixelUpdate(id: $id, webPixel: $webPixel) {
            userErrors {
              field
              message
              code
            }
            webPixel {
              id
              settings
            }
          }
        }`,
      {
        variables: {
          id: existing.id,
          webPixel: { settings },
        },
      },
    );
    const updateJson = await updateResponse.json();
    const errors = updateJson.data?.webPixelUpdate?.userErrors;
    if (errors?.length) {
      console.error("[web pixel] webPixelUpdate errors", errors);
      return null;
    }

    console.log("[web pixel] updated endpoint", endpoint);
    return updateJson.data?.webPixelUpdate?.webPixel;
  }

  const createResponse = await graphql(
    `#graphql
      mutation WebPixelCreate($webPixel: WebPixelInput!) {
        webPixelCreate(webPixel: $webPixel) {
          userErrors {
            field
            message
            code
          }
          webPixel {
            id
            settings
          }
        }
      }`,
    {
      variables: {
        webPixel: { settings },
      },
    },
  );
  const createJson = await createResponse.json();
  const errors = createJson.data?.webPixelCreate?.userErrors;
  if (errors?.length) {
    console.error("[web pixel] webPixelCreate errors", errors);
    return null;
  }

  console.log("[web pixel] created with endpoint", endpoint);
  return createJson.data?.webPixelCreate?.webPixel;
}

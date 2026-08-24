import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  // The authenticate.admin method returns a CORS method to automatically wrap responses so that extensions, which are hosted on extensions.shopifycdn.com, can access this route.
  const { cors } = await authenticate.admin(request);

  const productIssues = [
    { title: "Too big", description: "The product was too big." },
    { title: "Too small", description: "The product was too small." },
    {
      title: "Just right",
      description:
        "The product was just right, but the customer is still unhappy.",
    },
  ];

  const url = new URL(request.url);
  const productId = url.searchParams.get("productId") || "";
  const splitStr = productId.split("/");
  const idNumber = parseInt(splitStr[splitStr.length - 1], 10);
  const issueIndex = Number.isFinite(idNumber)
    ? idNumber % productIssues.length
    : 0;

  const issue = productIssues[issueIndex];

  return cors(Response.json({ productIssue: issue }));
};

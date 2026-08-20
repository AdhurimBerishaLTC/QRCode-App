import { render } from "preact";
// Import hooks for state management
import { useState, useEffect } from "preact/hooks";
export default async () => {
  render(<Extension />, document.body);
};
function Extension() {
  // Set up states to track loading status of storename
  const [isLoading, setIsLoading] = useState(true);
  const [storeName, setStoreName] = useState("");
  // useEffect runs when the component mounts (modal opens)
  useEffect(() => {
    async function fetchStoreName() {
      try {
        // Define the GraphQL query to fetch the storename
        const requestBody = {
          query: `
            query {
              shop {
                name
              }
            }
          `,
        };
        // Make a POST request to the GraphQL Admin API
        const response = await fetch("shopify:admin/api/graphql.json", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });
        const data = await response.json();
        // Extract the storename from the GraphQL response structure
        setStoreName(data.data.shop.name);
      } catch (error) {
        // If the API call fails, log the error and show a fallback message
        console.error("Failed to fetch store name:", error);
        setStoreName("Unknown");
      } finally {
        // Set loading to false whether the request succeeded or failed
        setIsLoading(false);
      }
    }

    // Call the function to fetch the store name
    fetchStoreName();
  }, []);
  return (
    <s-page heading="Where am I?">
      <s-scroll-box>
        <s-box padding="small">
          <s-text>
            {isLoading ? "Fetching store name..." : `You are in ${storeName}`}
          </s-text>
        </s-box>
      </s-scroll-box>
    </s-page>
  );
}

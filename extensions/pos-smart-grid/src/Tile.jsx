import { render } from "preact";
export default async () => {
  render(<Extension />, document.body);
};
function Extension() {
  return (
    <s-tile
      heading="Where am I?"
      subheading="Find your Shopify store"
      onClick={() => shopify.action.presentModal()}
    />
  );
}

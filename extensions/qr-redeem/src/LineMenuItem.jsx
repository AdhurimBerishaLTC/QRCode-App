import "@shopify/ui-extensions/preact";
import { render } from "preact";

export default async () => {
  render(<LineMenuItem />, document.body);
};

function LineMenuItem() {
  const { i18n } = shopify;

  return (
    <s-button onClick={() => shopify.action.presentModal()}>
      {i18n.translate("line_menu_label")}
    </s-button>
  );
}

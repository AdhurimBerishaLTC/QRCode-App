import "@shopify/ui-extensions/preact";
import { render } from "preact";
import { useState } from "preact/hooks";

export default async () => {
  render(<MenuActionModalExtension />, document.body);
};

function MenuActionModalExtension() {
  const [note, setNote] = useState("");

  function saveNote() {
    try {
      // make a request to the server to add a note
      console.log(note);
    } catch (error) {
      console.log(error);
    } finally {
      shopify.close();
    }
  }

  return (
    <s-customer-account-action heading="Add a note to the order">
      <s-text-area
        value={note}
        onChange={(e) =>
          setNote(
            /** @type {{ value?: string } | null } */ (e.currentTarget)?.value ??
              "",
          )
        }
        rows={3}
        label="Note for the order"
      />

      <s-button slot="primary-action" type="submit" onClick={saveNote}>
        Add note
      </s-button>
      <s-button
        slot="secondary-actions"
        onClick={() => shopify.close()}
        variant="secondary"
      >
        Cancel
      </s-button>
    </s-customer-account-action>
  );
}

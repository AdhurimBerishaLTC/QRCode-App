import { render } from "preact";
import { useCallback, useEffect, useState } from "preact/hooks";
import { getIssues, updateIssues } from "./utils";

/**
 * @typedef {import("./utils").Issue} Issue
 * @typedef {{ title: string, description: string }} IssueForm
 * @typedef {{ title: boolean, description: boolean }} FormErrors
 */

export default async () => {
  render(<Extension />, document.body);

  /**
   * @param {Issue[]} allIssues
   */
  function generateId(allIssues) {
    return !allIssues?.length ? 0 : allIssues[allIssues.length - 1].id + 1;
  }

  /**
   * @param {IssueForm} form
   */
  function validateForm({ title, description }) {
    return {
      isValid: Boolean(title) && Boolean(description),
      errors: {
        title: !title,
        description: !description,
      },
    };
  }

  function Extension() {
    const { close, data, i18n } = shopify;
    const [issue, setIssue] = useState(
      /** @type {IssueForm} */ ({ title: "", description: "" }),
    );
    const [allIssues, setAllIssues] = useState(/** @type {Issue[]} */ ([]));
    const [formErrors, setFormErrors] = useState(
      /** @type {FormErrors | null} */ (null),
    );
    const { title, description } = issue;

    useEffect(() => {
      getIssues(data.selected[0].id).then((issues) =>
        setAllIssues(issues || []),
      );
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const onSubmit = useCallback(async () => {
      const { isValid, errors } = validateForm(issue);
      setFormErrors(errors);

      if (isValid) {
        // Commit changes to the database
        await updateIssues(data.selected[0].id, [
          ...allIssues,
          {
            id: generateId(allIssues),
            completed: false,
            ...issue,
          },
        ]);
        // Close the modal using the 'close' API
        close();
      }
    }, [issue, data.selected, allIssues, close]);

    return (
      <s-admin-action heading={i18n.translate("name")}>
        <s-button slot="primary-action" onClick={onSubmit}>
          {i18n.translate("issue-create-button")}
        </s-button>
        <s-button slot="secondary-actions" onClick={close}>
          {i18n.translate("issue-cancel-button")}
        </s-button>
        <s-text-field
          value={title}
          error={
            formErrors?.title ? i18n.translate("issue-title-error") : undefined
          }
          onChange={(event) =>
            setIssue((prev) => ({
              ...prev,
              title: /** @type {HTMLInputElement} */ (event.target).value,
            }))
          }
          label={i18n.translate("issue-title-label")}
          maxLength={50}
        />
        <s-box paddingBlockStart="large">
          <s-text-area
            value={description}
            error={
              formErrors?.description
                ? i18n.translate("issue-description-error")
                : undefined
            }
            onChange={(event) =>
              setIssue((prev) => ({
                ...prev,
                description: /** @type {HTMLInputElement} */ (event.target)
                  .value,
              }))
            }
            label={i18n.translate("issue-description-label")}
            maxLength={300}
          />
        </s-box>
      </s-admin-action>
    );
  }
};

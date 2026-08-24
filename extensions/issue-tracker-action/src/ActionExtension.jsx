import "@shopify/ui-extensions/preact";
import { render } from "preact";
import { useCallback, useEffect, useState } from "preact/hooks";
import { getIssues, updateIssues } from "./utils";

/**
 * @typedef {import("./utils").Issue} Issue
 * @typedef {{
 *   title: string
 *   description: string
 *   id?: number | string | null
 *   completed?: boolean
 * }} IssueForm
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
    const { close, data, i18n, intents } = shopify;
    const issueId = intents?.launchUrl
      ? new URL(intents?.launchUrl)?.searchParams?.get("issueId")
      : null;
    const [loading, setLoading] = useState(issueId ? true : false);
    const [issue, setIssue] = useState(
      /** @type {IssueForm} */ ({ title: "", description: "", id: issueId }),
    );
    const [allIssues, setAllIssues] = useState(/** @type {Issue[]} */ ([]));
    const [formErrors, setFormErrors] = useState(
      /** @type {FormErrors | null} */ (null),
    );
    const { title, description } = issue;
    const isEditing = Boolean(issueId);

    useEffect(() => {
      getIssues(data.selected[0].id).then((issues) => {
        setLoading(false);
        setAllIssues(issues || []);
      });
    }, []);

    const onSubmit = useCallback(async () => {
      const { isValid, errors } = validateForm(issue);
      setFormErrors(errors);

      if (isValid) {
        const newIssues = [...allIssues];

        if (isEditing) {
          const editingIssueIndex = newIssues.findIndex(
            (listIssue) => `${listIssue.id}` === `${issue.id}`,
          );

          newIssues[editingIssueIndex] = {
            ...newIssues[editingIssueIndex],
            title,
            description,
          };
        } else {
          newIssues.push({
            id: generateId(allIssues),
            title,
            description,
            completed: false,
          });
        }

        await updateIssues(data.selected[0].id, newIssues);

        close();
      }
    }, [issue, data.selected, allIssues, close, isEditing, title, description]);

    useEffect(() => {
      if (issueId) {
        const editingIssue = allIssues.find(({ id }) => `${id}` === issueId);
        if (editingIssue) {
          setIssue(editingIssue);
        }
      }
    }, [issueId, allIssues]);

    if (loading) {
      return <></>;
    }

    return (
      <s-admin-action
        heading={i18n.translate(
          isEditing ? "edit-issue-heading" : "create-issue-heading",
        )}
      >
        <s-button slot="primary-action" onClick={onSubmit}>
          {i18n.translate(
            isEditing ? "issue-save-button" : "issue-create-button",
          )}
        </s-button>
        <s-button
          slot="secondary-actions"
          onClick={() => {
            close();
          }}
        >
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

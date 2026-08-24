import "@shopify/ui-extensions/preact";
import { render } from "preact";
import { useEffect, useMemo, useState } from "preact/hooks";

import { getIssues, updateIssues } from "./utils";

/**
 * @typedef {import("./utils").Issue} Issue
 */

export default async () => {
  render(<Extension />, document.body);
};

const PAGE_SIZE = 3;

/**
 * @param {Issue[]} list
 */
function statusKey(list) {
  return list.map((issue) => `${issue.id}:${issue.completed ? "1" : "0"}`).join(",");
}

function Extension() {
  const { data, i18n, navigation } = shopify;
  const productId = data?.selected?.[0]?.id;

  const [loading, setLoading] = useState(Boolean(productId));
  const [issues, setIssues] = useState(/** @type {Issue[]} */ ([]));
  const [initialIssues, setInitialIssues] = useState(/** @type {Issue[]} */ ([]));
  const [currentPage, setCurrentPage] = useState(1);

  const issuesCount = issues.length;
  const totalPages = Math.max(1, Math.ceil(issuesCount / PAGE_SIZE));
  const savedStatusKey = statusKey(initialIssues);
  const currentStatusKey = statusKey(issues);

  useEffect(() => {
    if (!productId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const parsedIssues = await getIssues(productId);
        if (!cancelled) {
          const snapshot = parsedIssues.map((issue) => ({ ...issue }));
          setIssues(snapshot);
          setInitialIssues(snapshot.map((issue) => ({ ...issue })));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [productId]);

  const paginatedIssues = useMemo(() => {
    if (issuesCount <= PAGE_SIZE) {
      return issues;
    }

    return issues.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  }, [issuesCount, issues, currentPage]);

  /**
   * @param {number} id
   * @param {string} value
   */
  const handleChange = (id, value) => {
    setIssues((currentIssues) =>
      currentIssues.map((issue) =>
        issue.id == id ? { ...issue, completed: value === "completed" } : issue,
      ),
    );
  };

  /**
   * @param {number} id
   */
  const handleDelete = async (id) => {
    if (!productId) return;
    const newIssues = issues.filter((issue) => issue.id !== id);
    setIssues(newIssues);
    await updateIssues(productId, newIssues);
    setInitialIssues(newIssues.map((issue) => ({ ...issue })));
  };

  const openCreateIssue = () => {
    navigation?.navigate("extension:issue-tracker-action");
  };

  let body;
  if (loading) {
    body = (
      <s-stack direction="inline" padding="base">
        <s-spinner accessibilityLabel={i18n.translate("name")} />
      </s-stack>
    );
  } else if (issuesCount === 0) {
    body = (
      <s-stack direction="block" gap="base">
        <s-text>{i18n.translate("no-issues-text")}</s-text>
        <s-button variant="primary" onClick={openCreateIssue}>
          {i18n.translate("add-first-issue-button")}
        </s-button>
      </s-stack>
    );
  } else {
    body = (
      <s-stack direction="block" gap="base">
        <s-form
          id="issues-form"
          onSubmit={(event) => {
            if (!productId) return;
            event.waitUntil?.(
              updateIssues(productId, issues).then(() => {
                setInitialIssues(issues.map((issue) => ({ ...issue })));
              }),
            );
          }}
          onReset={() => {
            setIssues(initialIssues.map((issue) => ({ ...issue })));
          }}
        >
          <s-box overflow="hidden" maxBlockSize="0px" maxInlineSize="0px">
            <s-text-field
              name="issue-status-state"
              label={i18n.translate("status-column-heading")}
              labelAccessibilityVisibility="exclusive"
              defaultValue={savedStatusKey}
              value={currentStatusKey}
            />
          </s-box>
          <s-table
            paginate
            hasNextPage={currentPage < totalPages}
            hasPreviousPage={currentPage > 1}
            onNextPage={() => setCurrentPage(currentPage + 1)}
            onPreviousPage={() => setCurrentPage(currentPage - 1)}
          >
            <s-table-header-row>
              <s-table-header listSlot="primary">
                {i18n.translate("issue-column-heading")}
              </s-table-header>
              <s-table-header>
                {i18n.translate("status-column-heading")}
              </s-table-header>
              <s-table-header></s-table-header>
            </s-table-header-row>
            <s-table-body>
              {paginatedIssues.map(({ id, title, description, completed }) => (
                <s-table-row key={id}>
                  <s-table-cell>
                    <s-stack direction="block" gap="small-100">
                      <s-heading accessibilityRole="presentation">
                        {title}
                      </s-heading>
                      <s-text color="subdued">{description}</s-text>
                    </s-stack>
                  </s-table-cell>
                  <s-table-cell>
                    <s-select
                      name={`issue-status-${id}`}
                      labelAccessibilityVisibility="exclusive"
                      label={i18n.translate("select-label")}
                      value={completed ? "completed" : "todo"}
                      onChange={(event) =>
                        handleChange(id, event.currentTarget.value)
                      }
                    >
                      <s-option value="todo">
                        {i18n.translate("option-todo")}
                      </s-option>
                      <s-option value="completed">
                        {i18n.translate("option-completed")}
                      </s-option>
                    </s-select>
                  </s-table-cell>
                  <s-table-cell>
                    <s-button
                      variant="tertiary"
                      icon="delete"
                      accessibilityLabel={i18n.translate("delete-issue-button")}
                      onClick={() => handleDelete(id)}
                    />
                  </s-table-cell>
                </s-table-row>
              ))}
            </s-table-body>
          </s-table>
        </s-form>
        <s-button onClick={openCreateIssue}>
          {i18n.translate("add-issue-button")}
        </s-button>
      </s-stack>
    );
  }

  return (
    <s-admin-block
      heading={i18n.translate("name")}
      collapsedSummary={
        loading ? undefined : issuesCount ? String(issuesCount) : "No issues"
      }
    >
      {body}
    </s-admin-block>
  );
}

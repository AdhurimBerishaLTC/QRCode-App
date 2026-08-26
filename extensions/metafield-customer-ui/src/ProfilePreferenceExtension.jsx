import "@shopify/ui-extensions/preact";
import { render } from "preact";
import { useState, useRef } from "preact/hooks";
import PropTypes from "prop-types";

/**
 * @typedef {{
 *   customerId: string,
 *   nickName?: string | null,
 * }} ProfilePreferenceProps
 */

export default async () => {
  const { customerId, nickName } = await getCustomerPreferences();

  render(
    <ProfilePreferenceExtension customerId={customerId} nickName={nickName} />,
    document.body,
  );
};

/**
 * @param {ProfilePreferenceProps} props
 */
function ProfilePreferenceExtension(props) {
  const { i18n } = shopify;
  const modalRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [nickName, setNickName] = useState(props.nickName || "");
  const [newNickName, setNewNickName] = useState(nickName);

  const closeModal = () => {
    /** @type {{ hideOverlay?: () => void } | null} */ (modalRef.current)
      ?.hideOverlay?.();
  };

  const handleSubmit = async () => {
    setLoading(true);
    const updatedNickname = await setCustomerPreferences(
      props.customerId,
      newNickName,
    );
    setNickName(updatedNickname);
    setLoading(false);
    closeModal();
  };

  /**
   * @param {Event} event
   */
  const handleNickNameInput = (event) => {
    const value = /** @type {{ value?: string } | null} */ (event.currentTarget)
      ?.value;
    setNewNickName(value ?? "");
  };

  return (
    <>
      <s-section>
        <s-stack direction="block" gap="large-200">
          <s-heading>
            <s-stack direction="inline" gap="small-100">
              <s-text>{i18n.translate("preferenceCard.heading")}</s-text>
              <s-link
                aria-label={i18n.translate("preferenceCard.edit")}
                command="--show"
                commandFor="profile-preference-modal"
              >
                <s-icon type="edit" size="small" />
              </s-link>
            </s-stack>
          </s-heading>
          <s-stack direction="block" gap="small-500">
            <s-text color="subdued">
              {i18n.translate("preferenceCard.nickName.label")}
            </s-text>
            <s-text>{nickName}</s-text>
          </s-stack>
        </s-stack>
      </s-section>

      <s-modal
        id="profile-preference-modal"
        ref={modalRef}
        heading={i18n.translate("preferenceCard.modalHeading")}
      >
        <s-form onSubmit={handleSubmit}>
          <s-stack direction="block" gap="large">
            <s-stack direction="block">
              <s-text-field
                label={i18n.translate("preferenceCard.nickName.label")}
                value={newNickName}
                onInput={handleNickNameInput}
              />
            </s-stack>
            <s-stack direction="inline" gap="base" justifyContent="end">
              <s-button
                slot="secondary-actions"
                variant="secondary"
                disabled={loading}
                onClick={closeModal}
              >
                {i18n.translate("preferenceCard.cancel")}
              </s-button>
              <s-button
                slot="primary-action"
                type="submit"
                variant="primary"
                loading={loading}
              >
                {i18n.translate("preferenceCard.save")}
              </s-button>
            </s-stack>
          </s-stack>
        </s-form>
      </s-modal>
    </>
  );
}

ProfilePreferenceExtension.propTypes = {
  customerId: PropTypes.string.isRequired,
  nickName: PropTypes.string,
};

async function getCustomerPreferences() {
  const response = await fetch(
    "shopify:customer-account/api/2025-10/graphql.json",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `query preferences($key: String!, $namespace: String!) {
          customer {
          id
            metafield(namespace: $namespace, key: $key) {
              value
            }
          }
        }`,
        variables: {
          key: "nickname",
          namespace: "$app",
        },
      }),
    },
  );

  const { data } = await response.json();

  return {
    customerId: data.customer.id,
    nickName: data.customer.metafield?.value,
  };
}

/**
 * @param {string} customerId
 * @param {string} nickName
 */
async function setCustomerPreferences(customerId, nickName) {
  const response = await fetch(
    "shopify:customer-account/api/2025-10/graphql.json",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `mutation setPreferences($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            metafields {
              value
            }
            userErrors {
              field
              message
            }
          }
        }`,
        variables: {
          metafields: [
            {
              key: "nickname",
              namespace: "$app",
              type: "single_line_text_field",
              ownerId: customerId,
              value: nickName ?? "",
            },
          ],
        },
      }),
    },
  );

  const { data } = await response.json();

  return data.metafieldsSet.metafields[0].value;
}

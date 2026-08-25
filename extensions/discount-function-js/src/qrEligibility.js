/**
 * @typedef {{
 *   attribute?: { value?: string | null } | null
 *   retailLocation?: { id?: string | null } | null
 *   buyerIdentity?: {
 *     isAuthenticated?: boolean | null
 *     customer?: { qrDiscountRedeemed?: { jsonValue?: boolean | null } | null } | null
 *   } | null
 *   lines?: Array<{ qrSrc?: { value?: string | null } | null } | null> | null
 * }} QrCart
 */

/**
 * POS cart properties often never show up as cart.attribute. Line item
 * properties do, so a QR scan is valid from either source.
 *
 * @param {QrCart | null | undefined} cart
 * @returns {boolean}
 */
export function isQrScan(cart) {
  if (cart?.attribute?.value === "qr") {
    return true;
  }

  return (cart?.lines ?? []).some((line) => line?.qrSrc?.value === "qr");
}

/**
 * Guests never get the discount. Online buyers must be logged in to a customer
 * account. POS only needs a customer on the cart (no Shop login).
 *
 * @param {QrCart | null | undefined} cart
 * @returns {boolean}
 */
export function isQrDiscountBlocked(cart) {
  const identity = cart?.buyerIdentity;
  const customer = identity?.customer;
  if (!customer) {
    return true;
  }

  if (customer.qrDiscountRedeemed?.jsonValue === true) {
    return true;
  }

  if (cart?.retailLocation) {
    return false;
  }

  return identity?.isAuthenticated !== true;
}

/**
 * @param {QrCart | null | undefined} cart
 * @param {{ requireQrScan?: boolean }} config
 * @returns {boolean}
 */
export function passesDiscountEligibility(cart, config) {
  if (!config.requireQrScan) {
    return true;
  }

  if (!isQrScan(cart)) {
    return false;
  }

  if (isQrDiscountBlocked(cart)) {
    return false;
  }

  return true;
}

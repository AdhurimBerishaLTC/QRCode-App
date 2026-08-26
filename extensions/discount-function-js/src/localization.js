/**
 * @param {{ localization?: { language?: { isoCode?: string } | null } | null } | null | undefined} input
 * @returns {string}
 */
export function languageCode(input) {
  return String(input?.localization?.language?.isoCode ?? "EN").toUpperCase();
}

/**
 * @param {string} language
 * @param {number} percent
 * @returns {string}
 */
export function productDiscountMessage(language, percent) {
  if (language === "FR") {
    return `SCAN QR — ${percent} % SUR LE PRODUIT`;
  }
  return `QR SCAN — ${percent}% OFF PRODUCT`;
}

/**
 * @param {string} language
 * @param {number} percent
 * @returns {string}
 */
export function orderDiscountMessage(language, percent) {
  if (language === "FR") {
    return `SCAN QR — ${percent} % DE RÉDUCTION`;
  }
  return `QR SCAN — ${percent}% OFF ORDER`;
}

/**
 * @param {string} language
 * @returns {string}
 */
export function freeShippingMessage(language) {
  if (language === "FR") {
    return "SCAN QR — LIVRAISON GRATUITE";
  }
  return "QR SCAN — FREE SHIPPING";
}

/**
 * @param {string} language
 * @param {number} percent
 * @returns {string}
 */
export function deliveryDiscountMessage(language, percent) {
  if (percent >= 100) {
    return freeShippingMessage(language);
  }
  if (language === "FR") {
    return `SCAN QR — ${percent} % SUR LA LIVRAISON`;
  }
  return `QR SCAN — ${percent}% OFF DELIVERY`;
}

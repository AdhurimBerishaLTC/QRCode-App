(() => {
  const PARAM = "src";
  const VALUE = "qr";

  const onReady = (callback) => {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback);
    } else {
      callback();
    }
  };

  const clearScanParam = () => {
    const url = new URL(window.location.href);
    if (url.searchParams.get(PARAM) !== VALUE) return;
    url.searchParams.delete(PARAM);
    const next = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState({}, "", next);
  };

  const hideBanner = (root) => {
    if (root._qrHideTimer) {
      window.clearTimeout(root._qrHideTimer);
      root._qrHideTimer = null;
    }
    root.classList.remove("is-visible");
    window.setTimeout(() => {
      root.hidden = true;
      root.replaceChildren();
    }, 250);
  };

  const showBanner = (root) => {
    const message = root.dataset.message || "You opened this page by scanning a QR code";
    const dismissLabel = root.dataset.dismissLabel || "Dismiss";

    const text = document.createElement("p");
    text.className = "qr-scan-banner__message";
    text.textContent = message;

    const dismiss = document.createElement("button");
    dismiss.type = "button";
    dismiss.className = "qr-scan-banner__dismiss";
    dismiss.textContent = dismissLabel;
    dismiss.addEventListener("click", () => hideBanner(root));

    root.replaceChildren(text, dismiss);
    root.hidden = false;
    requestAnimationFrame(() => {
      root.classList.add("is-visible");
    });

    clearScanParam();
    root._qrHideTimer = window.setTimeout(() => hideBanner(root), 3000);
  };

  const init = (root) => {
    const param = root.dataset.param || PARAM;
    const value = root.dataset.paramValue || VALUE;
    const url = new URL(window.location.href);

    if (url.searchParams.get(param) !== value) return;
    showBanner(root);
  };

  onReady(() => {
    document.querySelectorAll("[data-qr-scan-banner]").forEach(init);
  });
})();

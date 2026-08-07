(() => {
  const getQRCode = () => window.QRCode;

  const onReady = (callback) => {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback);
    } else {
      callback();
    }
  };

  const setStatus = (root, message) => {
    const status = root.querySelector("[data-qr-status]");
    if (status) status.textContent = message || "";
  };

  const waitForQrCode = async (tries = 0) => {
    const QRCode = getQRCode();
    if (QRCode && typeof QRCode.toDataURL === "function") {
      return;
    }
    if (tries >= 40) {
      throw new Error("QR library unavailable");
    }
    await new Promise((resolve) => window.setTimeout(resolve, 50));
    return waitForQrCode(tries + 1);
  };

  const ensureQrImage = async (root) => {
    await waitForQrCode();

    const image = root.querySelector("[data-qr-image]");
    const url = root.dataset.shareUrl;
    const QRCode = getQRCode();

    if (!image || !url) {
      throw new Error("Missing QR share data");
    }

    if (!QRCode?.toDataURL) {
      throw new Error("QR library unavailable");
    }

    if (image.getAttribute("src")) {
      return image;
    }

    setStatus(root, root.dataset.loadingLabel || "Generating QR code…");

    const dataUrl = await QRCode.toDataURL(url, {
      width: 420,
      margin: 1,
      color: {
        dark: "#111111",
        light: "#ffffff",
      },
    });

    image.src = dataUrl;
    image.hidden = false;
    setStatus(root, "");
    return image;
  };

  const copyLink = async (root) => {
    const url = root.dataset.shareUrl;
    if (!url) throw new Error("Missing URL");

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      return;
    }

    const input = document.createElement("input");
    input.value = url;
    input.setAttribute("readonly", "");
    input.style.position = "absolute";
    input.style.left = "-9999px";
    document.body.appendChild(input);
    input.select();

    try {
      const ok = document.execCommand("copy");
      document.body.removeChild(input);
      if (!ok) throw new Error("Copy failed");
    } catch (error) {
      document.body.removeChild(input);
      throw error;
    }
  };

  const downloadQr = (root, image) => {
    const title = root.dataset.productTitle || "product";
    const safeTitle = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const link = document.createElement("a");
    link.href = image.src;
    link.download = `${safeTitle || "product"}-qr-code.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openDialog = (dialog) => {
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  };

  const closeDialog = (dialog) => {
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  };

  const initBlock = (root) => {
    const dialog = root.querySelector("[data-qr-dialog]");
    const openButton = root.querySelector("[data-qr-open]");
    const closeButtons = root.querySelectorAll("[data-qr-close]");
    const copyButton = root.querySelector("[data-qr-copy]");
    const downloadButton = root.querySelector("[data-qr-download]");
    const nativeShareButton = root.querySelector("[data-qr-native-share]");

    if (!dialog || !openButton) return;

    if (nativeShareButton && !(navigator.share && root.dataset.shareUrl)) {
      nativeShareButton.hidden = true;
    }

    openButton.addEventListener("click", async () => {
      try {
        await ensureQrImage(root);
      } catch {
        setStatus(root, root.dataset.errorLabel || "Could not create QR code.");
      }
      openDialog(dialog);
    });

    closeButtons.forEach((button) => {
      button.addEventListener("click", () => closeDialog(dialog));
    });

    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) closeDialog(dialog);
    });

    copyButton?.addEventListener("click", async () => {
      try {
        await copyLink(root);
        const original = copyButton.textContent;
        copyButton.textContent = root.dataset.copiedLabel || "Copied";
        window.setTimeout(() => {
          copyButton.textContent = original;
        }, 1600);
      } catch {
        setStatus(root, root.dataset.copyErrorLabel || "Could not copy link.");
      }
    });

    downloadButton?.addEventListener("click", async () => {
      try {
        const image = await ensureQrImage(root);
        downloadQr(root, image);
      } catch {
        setStatus(root, root.dataset.errorLabel || "Could not create QR code.");
      }
    });

    if (nativeShareButton && navigator.share) {
      nativeShareButton.addEventListener("click", () => {
        navigator
          .share({
            title: root.dataset.productTitle || document.title,
            text: root.dataset.shareText || "",
            url: root.dataset.shareUrl,
          })
          .catch(() => {});
      });
    }
  };

  onReady(() => {
    document.querySelectorAll("[data-qr-share]").forEach(initBlock);
  });
})();

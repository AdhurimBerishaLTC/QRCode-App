(() => {
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

  const ensureQrImage = (root) => {
    const image = root.querySelector("[data-qr-image]");
    const imageUrl = root.dataset.imageUrl;

    if (!image || !imageUrl) {
      return Promise.reject(new Error("Missing QR share data"));
    }

    if (image.getAttribute("src") === imageUrl && !image.hidden) {
      return Promise.resolve(image);
    }

    setStatus(root, root.dataset.loadingLabel || "Generating QR code…");

    return new Promise((resolve, reject) => {
      const onLoad = () => {
        image.hidden = false;
        setStatus(root, "");
        cleanup();
        resolve(image);
      };
      const onError = () => {
        cleanup();
        reject(new Error("Could not load QR image"));
      };
      const cleanup = () => {
        image.removeEventListener("load", onLoad);
        image.removeEventListener("error", onError);
      };

      image.addEventListener("load", onLoad);
      image.addEventListener("error", onError);
      image.src = imageUrl;
      if (image.complete && image.naturalWidth > 0) onLoad();
    });
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

  const downloadQr = async (root, image) => {
    const title = root.dataset.productTitle || "product";
    const safeTitle = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const response = await fetch(image.src);
    if (!response.ok) throw new Error("Download failed");
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `${safeTitle || "product"}-qr-code.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
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
        await downloadQr(root, image);
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

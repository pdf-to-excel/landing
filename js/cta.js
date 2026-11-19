(() => {
  const variant = document.body.getAttribute("data-variant") || "b";
  const CONVERT_URL = "/api/convert";
  const OCR_INTEREST_URL = "/api/ocr-interest";
  const MAX_BYTES = 25 * 1024 * 1024;

  const statusEl = document.getElementById("convert-status");
  const fileInput = document.getElementById("file-input");
  const dropzone = document.getElementById("dropzone");
  const scanModal = document.getElementById("scan-modal");
  const scanOfferText = document.getElementById("scan-offer-text");
  const scanCta = document.getElementById("scan-offer-cta");
  const waitlistModal = document.getElementById("waitlist-modal");

  let pendingScanFile = null;
  let busy = false;

  const track = (names, params) => {
    if (typeof window.trackGoal === "function") window.trackGoal(names, params);
  };

  const setStatus = (text, kind) => {
    if (!statusEl) return;
    statusEl.textContent = text || "";
    statusEl.dataset.kind = kind || "";
    statusEl.hidden = !text;
  };

  const trackConvertOk = (source) => {
    track("cta_click", { variant, source: source || "convert" });
  };

  const showScanModal = (offer, filename) => {
    if (!scanModal) return;
    const price = offer && offer.price_rub != null ? offer.price_rub : 99;
    const cta = (offer && offer.cta) || `Распознать за ${price} ₽`;
    if (scanOfferText) {
      scanOfferText.textContent =
        (offer && offer.title) ||
        "Этот PDF похож на скан (фото страницы). Обычная конвертация таблицы не сработает — нужен OCR.";
    }
    if (scanCta) scanCta.textContent = cta;
    pendingScanFile = filename || null;
    scanModal.hidden = false;
    track("scan_offer_shown", { variant, filename: filename || "" });
  };

  const hideScanModal = () => {
    if (scanModal) scanModal.hidden = true;
  };

  const showWaitlistModal = () => {
    if (!waitlistModal) return;
    waitlistModal.hidden = false;
    track("ocr_waitlist_ack", { variant });
  };

  const hideWaitlistModal = () => {
    if (waitlistModal) waitlistModal.hidden = true;
  };

  const parseDetail = async (res) => {
    try {
      const data = await res.json();
      return data && data.detail != null ? data.detail : null;
    } catch (_) {
      return null;
    }
  };

  const errorMessage = (detail, status) => {
    if (typeof detail === "string" && detail) return detail;
    if (detail && typeof detail === "object" && detail.message) return detail.message;
    if (status === 413) return "Файл слишком большой (макс. 25 МБ)";
    if (status >= 500) return "Сервер временно недоступен. Попробуйте позже.";
    return "Не удалось конвертировать файл";
  };

  const acceptScanOffer = async () => {
    const filename = pendingScanFile || "";
    hideScanModal();
    setStatus("Записываем заявку…", "progress");
    try {
      await fetch(OCR_INTEREST_URL, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename, source: "scan_offer" }),
      });
    } catch (_) {
      /* still show popup — interest is best-effort */
    }
    track("scan_offer_accepted", { variant, filename });
    setStatus("Заявка записана", "ok");
    showWaitlistModal();
  };

  const convertFile = async (file, source) => {
    if (!file || busy) return;
    if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") {
      setStatus("Нужен файл в формате PDF", "error");
      return;
    }
    if (file.size > MAX_BYTES) {
      setStatus("Файл слишком большой (макс. 25 МБ)", "error");
      return;
    }

    busy = true;
    setStatus("Конвертируем… это может занять до минуты", "progress");

    const form = new FormData();
    form.append("file", file, file.name);

    try {
      const res = await fetch(CONVERT_URL, {
        method: "POST",
        body: form,
        credentials: "include",
      });
      if (!res.ok) {
        const detail = await parseDetail(res);
        if (detail && typeof detail === "object" && detail.code === "scanned_pdf") {
          setStatus(detail.message || "PDF выглядит как скан", "error");
          showScanModal(detail.offer, file.name);
          return;
        }
        setStatus(errorMessage(detail, res.status), "error");
        return;
      }
      const buffer = await res.arrayBuffer();
      const stem = file.name.replace(/\.pdf$/i, "") || "result";
      const filename = `${stem}.xlsx`;
      const store = window.pdfexelResultStore;
      if (!store || typeof store.saveResult !== "function") {
        setStatus("Не удалось сохранить результат для превью", "error");
        return;
      }
      await store.saveResult({ filename, bytes: buffer });
      trackConvertOk(source || "convert");
      setStatus("Готово — открываем результат…", "ok");
      location.assign("/result/");
    } catch (_) {
      setStatus("Нет связи с сервером. Проверьте интернет и попробуйте снова.", "error");
    } finally {
      busy = false;
      if (fileInput) fileInput.value = "";
    }
  };

  // MUST stay sync inside the click handler — browsers block fileInput.click() after await.
  const pickFile = (source) => {
    if (!fileInput) {
      setStatus("Не найден выбор файла на странице", "error");
      return;
    }
    fileInput.dataset.source = source || "pick";
    setStatus("Выберите PDF-файл…", "progress");
    fileInput.click();
  };

  document.querySelectorAll("[data-cta]").forEach((el) => {
    el.addEventListener("click", (event) => {
      event.preventDefault();
      const source = el.getAttribute("data-cta") || "cta";
      if (fileInput && fileInput.files && fileInput.files[0]) {
        convertFile(fileInput.files[0], source);
      } else {
        pickFile(source);
      }
    });
  });

  if (fileInput) {
    fileInput.addEventListener("change", () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) {
        setStatus("Файл не выбран", "error");
        return;
      }
      convertFile(file, fileInput.dataset.source || "file");
    });
  }

  if (dropzone) {
    dropzone.addEventListener("click", (e) => {
      if (e.target === fileInput) return;
      pickFile("dropzone");
    });
    dropzone.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        pickFile("dropzone");
      }
    });
    dropzone.addEventListener("dragenter", (e) => {
      e.preventDefault();
      dropzone.classList.add("is-drag");
    });
    dropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropzone.classList.add("is-drag");
    });
    dropzone.addEventListener("dragleave", () => dropzone.classList.remove("is-drag"));
    dropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzone.classList.remove("is-drag");
      const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) convertFile(file, "drop");
    });
  }

  if (scanCta) {
    scanCta.addEventListener("click", () => {
      acceptScanOffer();
    });
  }
  document.querySelectorAll("[data-scan-close]").forEach((el) => {
    el.addEventListener("click", hideScanModal);
  });
  document.querySelectorAll("[data-waitlist-close]").forEach((el) => {
    el.addEventListener("click", hideWaitlistModal);
  });
})();

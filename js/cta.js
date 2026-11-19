(() => {
  const variant = document.body.getAttribute("data-variant") || "b";
  const CONVERT_URL = "/api/convert";
  const MAX_BYTES = 25 * 1024 * 1024;

  const statusEl = document.getElementById("convert-status");
  const fileInput = document.getElementById("file-input");
  const dropzone = document.getElementById("dropzone");

  const setStatus = (text, kind) => {
    if (!statusEl) return;
    statusEl.textContent = text || "";
    statusEl.dataset.kind = kind || "";
    statusEl.hidden = !text;
  };

  const trackConvertOk = (source) => {
    if (typeof window.trackGoal === "function") {
      window.trackGoal("cta_click", { variant, source: source || "convert" });
    }
  };

  const errorMessage = async (res) => {
    try {
      const data = await res.json();
      if (data && data.detail) {
        return typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail);
      }
    } catch (_) {
      /* ignore */
    }
    if (res.status === 413) return "Файл слишком большой (макс. 25 МБ)";
    if (res.status >= 500) return "Сервер временно недоступен. Попробуйте позже.";
    return "Не удалось конвертировать файл";
  };

  let busy = false;

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
        setStatus(await errorMessage(res), "error");
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
})();

(() => {
  const statusEl = document.getElementById("result-status");
  const previewEl = document.getElementById("sheet-preview");
  const filenameEl = document.getElementById("result-filename");
  const downloadBtn = document.getElementById("download-xlsx");
  const chatLog = document.getElementById("chat-log");
  const chatForm = document.getElementById("chat-form");
  const chatInput = document.getElementById("chat-input");
  const modal = document.getElementById("dev-modal");

  let currentBlob = null;
  let currentName = "result.xlsx";

  const setStatus = (text, kind) => {
    if (!statusEl) return;
    statusEl.textContent = text || "";
    statusEl.dataset.kind = kind || "";
    statusEl.hidden = !text;
  };

  const track = (names, params) => {
    if (typeof window.trackGoal === "function") window.trackGoal(names, params);
  };

  const showModal = () => {
    if (!modal) return;
    modal.hidden = false;
    track("ai_dev_popup_shown");
  };

  const hideModal = () => {
    if (modal) modal.hidden = true;
  };

  const appendBubble = (role, text) => {
    if (!chatLog) return;
    const el = document.createElement("div");
    el.className = `chat-bubble chat-bubble--${role}`;
    el.textContent = text;
    chatLog.appendChild(el);
    chatLog.scrollTop = chatLog.scrollHeight;
  };

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "result.xlsx";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const renderPreview = (bytes) => {
    if (!previewEl) return;
    if (typeof XLSX === "undefined") {
      setStatus("Не загрузился просмотрщик таблиц", "error");
      return;
    }
    const wb = XLSX.read(bytes, { type: "array" });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) {
      setStatus("В файле нет листов", "error");
      return;
    }
    const html = XLSX.utils.sheet_to_html(wb.Sheets[sheetName], { id: "xlsx-table", editable: false });
    previewEl.innerHTML = html;
    const table = previewEl.querySelector("table");
    if (table) table.classList.add("xlsx-preview-table");
  };

  const submitPrompt = (raw) => {
    const prompt = String(raw || "").trim();
    if (!prompt) return;
    appendBubble("user", prompt);
    track("ai_prompt_submit", { prompt: prompt.slice(0, 200) });
    appendBubble("bot", "Пока не умею править Excel — запрос сохранён. Скоро подключим ИИ.");
    showModal();
    if (chatInput) chatInput.value = "";
  };

  const boot = async () => {
    track("result_view");
    const store = window.pdfexelResultStore;
    if (!store) {
      setStatus("Нет сохранённого результата. Сконвертируйте PDF на главной.", "error");
      return;
    }
    let record;
    try {
      record = await store.loadResult();
    } catch (_) {
      setStatus("Не удалось прочитать результат", "error");
      return;
    }
    if (!record || !record.bytes) {
      setStatus("Нет сохранённого результата. Сконвертируйте PDF на главной.", "error");
      return;
    }
    currentName = record.filename || "result.xlsx";
    const bytes = record.bytes instanceof ArrayBuffer ? record.bytes : new Uint8Array(record.bytes).buffer;
    currentBlob = new Blob([bytes], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    if (filenameEl) {
      filenameEl.textContent = currentName;
      filenameEl.hidden = false;
    }
    if (downloadBtn) {
      downloadBtn.hidden = false;
      downloadBtn.addEventListener("click", () => downloadBlob(currentBlob, currentName));
    }
    renderPreview(bytes);
  };

  if (chatForm) {
    chatForm.addEventListener("submit", (e) => {
      e.preventDefault();
      submitPrompt(chatInput && chatInput.value);
    });
  }

  document.querySelectorAll("[data-prompt]").forEach((el) => {
    el.addEventListener("click", () => {
      const prompt = el.getAttribute("data-prompt") || "";
      if (chatInput) chatInput.value = prompt;
      submitPrompt(prompt);
    });
  });

  document.querySelectorAll("[data-dev-close]").forEach((el) => {
    el.addEventListener("click", hideModal);
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

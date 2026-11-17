(() => {
  const REQUEST_URL = "/api/auth/request-code";
  const VERIFY_URL = "/api/auth/verify";
  const ME_URL = "/api/auth/me";

  let resolveLogin = null;
  let pendingFile = null;
  let pendingSource = null;

  const ensureModal = () => {
    let root = document.getElementById("auth-modal");
    if (root) return root;

    root = document.createElement("div");
    root.id = "auth-modal";
    root.className = "auth-modal";
    root.hidden = true;
    root.innerHTML = `
      <div class="auth-modal__backdrop" data-auth-close></div>
      <div class="auth-modal__panel" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <h2 id="auth-title">Вход по email</h2>
        <p class="auth-modal__lead">Нужен email, чтобы конвертировать файл. Код придёт письмом.</p>
        <label class="auth-field">
          <span>Email</span>
          <input type="email" id="auth-email" autocomplete="email" required />
        </label>
        <label class="auth-field" id="auth-code-wrap" hidden>
          <span>Код из письма</span>
          <input type="text" id="auth-code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" />
        </label>
        <p class="auth-modal__status" id="auth-status" hidden></p>
        <div class="auth-modal__actions">
          <button type="button" class="btn btn-ghost" data-auth-close>Отмена</button>
          <button type="button" class="btn btn-primary" id="auth-submit">Получить код</button>
        </div>
      </div>
    `;
    document.body.appendChild(root);

    root.querySelectorAll("[data-auth-close]").forEach((el) => {
      el.addEventListener("click", () => closeModal(false));
    });
    root.querySelector("#auth-submit").addEventListener("click", onSubmit);
    root.querySelector("#auth-code").addEventListener("keydown", (e) => {
      if (e.key === "Enter") onSubmit();
    });
    root.querySelector("#auth-email").addEventListener("keydown", (e) => {
      if (e.key === "Enter") onSubmit();
    });
    return root;
  };

  const setStatus = (text, kind) => {
    const el = document.getElementById("auth-status");
    if (!el) return;
    el.textContent = text || "";
    el.dataset.kind = kind || "";
    el.hidden = !text;
  };

  const closeModal = (ok) => {
    const root = document.getElementById("auth-modal");
    if (root) root.hidden = true;
    const done = resolveLogin;
    resolveLogin = null;
    if (done) done(!!ok);
  };

  const openModal = () => {
    const root = ensureModal();
    root.hidden = false;
    const codeWrap = document.getElementById("auth-code-wrap");
    const submit = document.getElementById("auth-submit");
    codeWrap.hidden = true;
    submit.textContent = "Получить код";
    setStatus("", "");
    document.getElementById("auth-email").focus();
  };

  const onSubmit = async () => {
    const emailEl = document.getElementById("auth-email");
    const codeEl = document.getElementById("auth-code");
    const codeWrap = document.getElementById("auth-code-wrap");
    const submit = document.getElementById("auth-submit");
    const email = (emailEl.value || "").trim();
    if (!email || !email.includes("@")) {
      setStatus("Укажите корректный email", "error");
      return;
    }

    submit.disabled = true;
    try {
      if (codeWrap.hidden) {
        setStatus("Отправляем код…", "progress");
        const res = await fetch(REQUEST_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email }),
        });
        if (res.status === 429) {
          setStatus("Слишком много запросов. Подождите немного.", "error");
          return;
        }
        if (!res.ok) {
          setStatus("Не удалось отправить код. Попробуйте позже.", "error");
          return;
        }
        codeWrap.hidden = false;
        submit.textContent = "Войти";
        setStatus("Код отправлен на почту", "ok");
        codeEl.focus();
        return;
      }

      const code = (codeEl.value || "").trim();
      if (!/^\d{6}$/.test(code)) {
        setStatus("Введите 6-значный код", "error");
        return;
      }
      setStatus("Проверяем…", "progress");
      const res = await fetch(VERIFY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, code }),
      });
      if (!res.ok) {
        setStatus("Неверный или просроченный код", "error");
        return;
      }
      closeModal(true);
    } catch (_) {
      setStatus("Нет связи с сервером", "error");
    } finally {
      submit.disabled = false;
    }
  };

  window.pdfexelAuth = {
    ensureSession: async () => {
      try {
        const res = await fetch(ME_URL, { credentials: "include" });
        if (res.ok) return true;
      } catch (_) {
        /* fall through to modal */
      }
      return new Promise((resolve) => {
        resolveLogin = resolve;
        openModal();
      });
    },
    setPendingConvert: (file, source) => {
      pendingFile = file;
      pendingSource = source;
    },
    takePendingConvert: () => {
      const out = { file: pendingFile, source: pendingSource };
      pendingFile = null;
      pendingSource = null;
      return out;
    },
  };
})();

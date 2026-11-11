(() => {
  const variant = document.body.getAttribute("data-variant") || "b";
  const modal = document.getElementById("dev-modal");
  const closeBtn = document.getElementById("dev-modal-close");
  const backdrop = modal && modal.querySelector("[data-modal-close]");

  const openModal = (source) => {
    if (!modal) return;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    if (typeof window.trackGoal === "function") {
      window.trackGoal(["cta_click", "popup_shown"], { variant, source: source || "cta" });
    }
  };

  const closeModal = () => {
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = "";
  };

  document.querySelectorAll("[data-cta]").forEach((el) => {
    el.addEventListener("click", (event) => {
      event.preventDefault();
      openModal(el.getAttribute("data-cta") || "cta");
    });
  });

  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("file-input");
  if (dropzone) {
    const trigger = () => openModal("dropzone");
    dropzone.addEventListener("click", trigger);
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
      trigger();
    });
    if (fileInput) {
      fileInput.addEventListener("change", () => {
        fileInput.value = "";
        trigger();
      });
    }
  }

  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  if (backdrop) backdrop.addEventListener("click", closeModal);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal && !modal.hidden) closeModal();
  });
})();

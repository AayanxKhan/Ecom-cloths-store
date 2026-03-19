// Keep all logic in one place for beginner-friendliness.
document.addEventListener("DOMContentLoaded", () => {
  // --- Footer year ---
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // --- EmailJS setup ---
  // Replace these values with IDs from EmailJS dashboard.
  // IMPORTANT: `template_id` must belong to the same `service_id`.
  const SERVICE_ID = "service_4a7q17p";
  const TEMPLATE_ID = "template_zt81dvk";
  const PUBLIC_KEY = "sa_QoRGfwPB_mdbke";

  // Initialize EmailJS (required before emailjs.send()).
  let emailjsReady = false;
  let emailjsStatus = {
    hasEmailjs: false,
    initType: "none",
    initError: "",
  };
  let emailjsSdk = null;

  function getEmailjsSdk() {
    // EmailJS v4 exposes a global named `emailjs`.
    // Some environments attach it to `globalThis`, some to `window`.
    const g = globalThis || window;
    return g.emailjs || null;
  }

  function refreshEmailjsStatus() {
    emailjsSdk = getEmailjsSdk();
    emailjsStatus.hasEmailjs = !!emailjsSdk;
    emailjsStatus.initType =
      emailjsSdk && typeof emailjsSdk.init === "function"
        ? "function"
        : typeof (emailjsSdk && emailjsSdk.init);
  }

  function tryInitEmailjs() {
    refreshEmailjsStatus();
    emailjsStatus.initError = "";

    if (emailjsSdk && typeof emailjsSdk.init === "function") {
      // v4 init expects an object: { publicKey: "..." }
      emailjsSdk.init({ publicKey: PUBLIC_KEY });
      emailjsReady = true;
      return true;
    }
    return false;
  }

  // First attempt when the page is ready.
  try {
    tryInitEmailjs();
  } catch (e) {
    emailjsStatus.initError = String(e && e.message ? e.message : e);
    emailjsReady = false;
    console.error("EmailJS init failed:", e);
  }

  // Extra debugging for beginners:
  // If this prints `undefined`, then the CDN script did not expose the SDK globally.
  console.log("EmailJS debug:", {
    typeofEmailjs: typeof globalThis.emailjs,
    hasInit: !!(globalThis.emailjs && typeof globalThis.emailjs.init === "function"),
  });

  // --- DOM references ---
  const orderOverlay = document.getElementById("orderOverlay");
  const orderPopup = document.getElementById("orderPopup");
  const closePopupBtn = document.getElementById("closePopupBtn");
  const cancelBtn = document.getElementById("cancelBtn");
  const quickOrderBtn = document.getElementById("quickOrderBtn");
  const heroOrderBtn = document.getElementById("heroOrderBtn");

  const fullNameInput = document.getElementById("fullName");
  const phoneInput = document.getElementById("phoneNumber");
  const addressInput = document.getElementById("address");
  const productNameInput = document.getElementById("productName");

  const orderForm = document.getElementById("orderForm");
  const formMessage = document.getElementById("formMessage");
  const formError = document.getElementById("formError");

  const submitBtn = document.getElementById("submitBtn");
  const submitSpinner = document.getElementById("submitSpinner");
  const submitText = document.getElementById("submitText");

  const buyButtons = Array.from(document.querySelectorAll(".buyBtn"));
  const defaultProductName = buyButtons[0]?.getAttribute("data-product-name") || "";
  const searchInput = document.getElementById("searchInput");
  const productCards = Array.from(document.querySelectorAll(".productCard"));
  const resultsCount = document.getElementById("resultsCount");

  // --- Popup helpers ---
  function showEl(el) {
    if (!el) return;
    el.classList.remove("hidden");
  }

  function hideEl(el) {
    if (!el) return;
    el.classList.add("hidden");
  }

  function clearMessages() {
    hideEl(formMessage);
    hideEl(formError);
    formMessage.textContent = "";
    formError.textContent = "";
  }

  function openOrderForm(productName) {
    clearMessages();
    productNameInput.value = productName || "";

    showEl(orderOverlay);
    showEl(orderPopup);

    // Focus first input for better UX on mobile.
    fullNameInput.focus();
  }

  // --- Search filter (frontend only) ---
  function normalizeText(str) {
    return (str || "").toLowerCase().trim();
  }

  function applySearchFilter() {
    if (!searchInput || productCards.length === 0) return;

    const query = normalizeText(searchInput.value);
    const total = productCards.length;
    let visible = 0;

    productCards.forEach((card) => {
      const name = normalizeText(card.getAttribute("data-product-name"));
      const show = query === "" || name.includes(query);
      card.style.display = show ? "" : "none";
      if (show) visible += 1;
    });

    if (resultsCount) {
      if (visible === total) resultsCount.textContent = `${visible} products`;
      else resultsCount.textContent = `${visible} of ${total} products`;
    }
  }

  if (searchInput) {
    searchInput.addEventListener("input", applySearchFilter);
    // Set initial count.
    applySearchFilter();
  }

  function closeOrderForm() {
    hideEl(orderOverlay);
    hideEl(orderPopup);
    clearMessages();
  }

  // --- Buy Now click ---
  buyButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const productName = btn.getAttribute("data-product-name") || "";
      openOrderForm(productName);
    });
  });

  // Optional: "Quick Order" opens form without selecting a product.
  if (quickOrderBtn) {
    quickOrderBtn.addEventListener("click", () => openOrderForm(defaultProductName));
  }
  if (heroOrderBtn) {
    heroOrderBtn.addEventListener("click", () => openOrderForm(defaultProductName));
  }

  closePopupBtn.addEventListener("click", closeOrderForm);
  cancelBtn.addEventListener("click", closeOrderForm);
  orderOverlay.addEventListener("click", closeOrderForm);

  // --- Basic validation (no empty fields) ---
  function getTrimmedValue(el) {
    return (el && typeof el.value === "string") ? el.value.trim() : "";
  }

  function validateForm() {
    const fullName = getTrimmedValue(fullNameInput);
    const phone = getTrimmedValue(phoneInput);
    const address = getTrimmedValue(addressInput);
    const productName = getTrimmedValue(productNameInput);

    if (!fullName) return "Please enter your full name.";
    if (!phone) return "Please enter your phone number.";
    if (!address) return "Please enter your address.";
    if (!productName) return "Please select a product by clicking Buy Now.";

    return "";
  }

  function setLoading(isLoading) {
    if (!submitBtn || !submitSpinner || !submitText) return;

    submitBtn.disabled = isLoading;
    if (isLoading) {
      hideEl(submitText);
      showEl(submitSpinner);
    } else {
      showEl(submitText);
      hideEl(submitSpinner);
    }
  }

  function showError(message, details) {
    formError.textContent = message + (details ? ` (${details})` : "");
    showEl(formError);
  }

  function getEmailJsErrorDetails(err) {
    if (!err) return "";
    // EmailJS errors can be strings, Error objects, or objects with "text".
    if (typeof err === "string") return err;
    if (err && typeof err === "object") {
      return err.text || err.message || JSON.stringify(err);
    }
    return String(err);
  }

  // --- Send email using EmailJS ---
  orderForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearMessages();

    const validationError = validateForm();
    if (validationError) {
      formError.textContent = validationError;
      showEl(formError);
      return;
    }

    const fullName = getTrimmedValue(fullNameInput);
    const phoneNumber = getTrimmedValue(phoneInput);
    const address = getTrimmedValue(addressInput);
    const productName = getTrimmedValue(productNameInput);

    // Helpful checks for the most common mistakes.
    if (!emailjsReady) {
      // Sometimes the EmailJS SDK loads a bit after DOMContentLoaded.
      // Try initializing again right before we send.
      try {
        // wait a tiny bit, then re-check
        await new Promise((r) => setTimeout(r, 250));
        tryInitEmailjs();
      } catch (e) {
        emailjsStatus.initError = String(e && e.message ? e.message : e);
      }
    }

    if (!emailjsReady) {
      showError(
        "EmailJS is not initialized. Check your PUBLIC_KEY and console.",
        `hasEmailjs=${emailjsStatus.hasEmailjs}, initType=${emailjsStatus.initType}${
          emailjsStatus.initError ? ", initError=" + emailjsStatus.initError : ""
        }, service_id=${SERVICE_ID}, template_id=${TEMPLATE_ID}`
      );
      return;
    }

    // Template variables must match what you set up in EmailJS dashboard.
    const templateParams = {
      full_name: fullName,
      phone_number: phoneNumber,
      address: address,
      product_name: productName,
    };

    setLoading(true);

    try {
      // IMPORTANT: EmailJS uses your service_id/template_id from the dashboard.
      const sdk = getEmailjsSdk();
      if (!sdk || typeof sdk.send !== "function") {
        showError(
          "EmailJS SDK found, but send() is not available.",
          `hasSend=${sdk && typeof sdk.send}`
        );
        return;
      }
      await sdk.send(SERVICE_ID, TEMPLATE_ID, templateParams);

      formMessage.textContent = "Order placed successfully";
      showEl(formMessage);

      // Reset form after success.
      orderForm.reset();

      // Close popup after a short delay so user can read the message.
      setTimeout(() => {
        closeOrderForm();
      }, 1200);
    } catch (err) {
      const details = getEmailJsErrorDetails(err);
      showError(
        "Could not send the email right now.",
        `${details} (service_id=${SERVICE_ID}, template_id=${TEMPLATE_ID})`
      );

      // Helpful for debugging in console:
      console.error("EmailJS send error:", err);
    } finally {
      setLoading(false);
    }
  });
});


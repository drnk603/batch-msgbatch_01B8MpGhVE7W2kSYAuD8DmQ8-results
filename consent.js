(function () {
  const STORAGE_KEY = "cookie_consent_v2";

  window.dataLayer = window.dataLayer || [];
  const gtag = function () {
    window.dataLayer.push(arguments);
  };
  window.gtag = window.gtag || gtag;

  gtag("consent", "default", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    wait_for_update: 500,
  });

  const consentMap = {
    accept_all: {
      analytics_storage: "granted",
      ad_storage: "granted",
      ad_user_data: "granted",
      ad_personalization: "granted",
    },
    analytics_only: {
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    },
    reject_all: {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    },
  };

  const saveChoice = (type) => {
    if (!consentMap[type]) return;

    localStorage.setItem(STORAGE_KEY, type);

    if (window.gtag) {
      window.gtag("consent", "update", consentMap[type]);
    }

    window.dataLayer.push({
      event: "consent_update",
    });
  };

  const injectCss = () => {
    if (document.getElementById("cookie-consent-css")) return;

    const link = document.createElement("link");
    link.id = "cookie-consent-css";
    link.rel = "stylesheet";
    link.href = "/consent.css";
    document.head.appendChild(link);
  };

  const buildBanner = () => {
    const wrap = document.createElement("div");
    wrap.className = "cc-wrapper";

    wrap.innerHTML = `
      <div class="cc-card">
        <div class="cc-header">We respect your privacy</div>
        <div class="cc-body">
          We use cookies for site functionality, analytics, and advertising.
          You can choose what you allow.
        </div>
        <div class="cc-actions">
          <button class="cc-btn cc-accept" data-choice="accept_all">Accept all</button>
          <button class="cc-btn cc-analytics" data-choice="analytics_only">Only analytics</button>
          <button class="cc-btn cc-reject" data-choice="reject_all">Reject all</button>
        </div>
        <div class="cc-links">
          <a href="/privacy.html">Privacy Policy</a>
          <a href="/cookie-policy.html">Cookie Policy</a>
        </div>
      </div>
    `;

    document.body.appendChild(wrap);

    wrap.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-choice]");
      if (!btn) return;

      saveChoice(btn.dataset.choice);
      wrap.remove();
    });
  };

  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    saveChoice(saved);
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (saved) return;

    injectCss();
    buildBanner();
  });
})();

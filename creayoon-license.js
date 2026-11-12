
(function () {
  "use strict";

  const CONFIG = {
    API_URL: "https://script.google.com/macros/s/AKfycbyIjVUQTCA6UDAalGnpFPNFgiepo35fxbVWNDQ2tp6MtWGgiZEWM0RWlh0-xd-Yz659AQ/exec",
    REDIRECT_URL: "https://www.dzakiedu.my.id/",
    WIDGET_TITLE: "Kode Lisensi"
  };

  function findLicenseWidget() {
    const widgets = document.querySelectorAll(".widget");
    const matches = [];

    widgets.forEach(function (widget) {
      const headings = widget.querySelectorAll(
        ".title, .widget-title, h2, h3, h4"
      );

      headings.forEach(function (heading) {
        if (
          heading.textContent.trim().toLowerCase() ===
          CONFIG.WIDGET_TITLE.toLowerCase()
        ) {
          matches.push(widget);
        }
      });
    });

    if (matches.length !== 1) return null;

    const widget = matches[0];
    const content = widget.querySelector(".widget-content");

    if (!content) return null;

    const key = content.textContent.trim();

    widget.style.display = "none";

    if (!/^CRY-[A-Z0-9]{8}-[A-Z0-9]{8}-[A-Z0-9]{8}$/i.test(key)) {
      return null;
    }

    return key;
  }

  function showError(message, retry) {
    let panel = document.getElementById("creayoon-license-error");

    if (!panel) {
      panel = document.createElement("div");
      panel.id = "creayoon-license-error";

      panel.style.cssText = [
        "position:fixed",
        "inset:0",
        "z-index:999999",
        "background:#fff",
        "display:flex",
        "align-items:center",
        "justify-content:center",
        "padding:24px",
        "font-family:Arial,sans-serif",
        "text-align:center"
      ].join(";");

      document.body.appendChild(panel);
    }

    panel.innerHTML = "";

    const wrapper = document.createElement("div");
    const heading = document.createElement("h2");
    const paragraph = document.createElement("p");
    const button = document.createElement("button");

    heading.textContent = "Layanan Lisensi";
    paragraph.textContent = message;
    button.textContent = "Coba Lagi";

    button.style.cssText =
      "padding:12px 24px;background:#176b4c;color:#fff;border:0;border-radius:6px;cursor:pointer";

    button.addEventListener("click", retry);

    wrapper.appendChild(heading);
    wrapper.appendChild(paragraph);
    wrapper.appendChild(button);
    panel.appendChild(wrapper);
  }

  function activateLicense(key) {
    return new Promise(function (resolve, reject) {
      const callbackName =
        "creayoonLicense_" +
        Date.now() +
        "_" +
        Math.random().toString(36).slice(2);

      const script = document.createElement("script");
      let finished = false;

      const timeout = setTimeout(function () {
        finish(new Error("Server lisensi tidak merespons."));
      }, 15000);

      function finish(error, result) {
        if (finished) return;
        finished = true;

        clearTimeout(timeout);
        delete window[callbackName];

        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }

        if (error) reject(error);
        else resolve(result);
      }

      window[callbackName] = function (result) {
        finish(null, result);
      };

      const params = new URLSearchParams({
        action: "activate",
        license_key: key,
        domain: location.hostname,
        callback: callbackName
      });

      script.onerror = function () {
        finish(new Error("Tidak dapat menghubungi server lisensi."));
      };

      script.src = CONFIG.API_URL + "?" + params.toString();

      document.head.appendChild(script);
    });
  }

  function start() {
    const key = findLicenseWidget();

    if (!key) {
      location.replace(CONFIG.REDIRECT_URL);
      return;
    }

    activateLicense(key)
      .then(function (result) {
        if (!result || result.success !== true) {
          location.replace(CONFIG.REDIRECT_URL);
        }
      })
      .catch(function (error) {
        console.error("[Creayoon License]", error);

        showError(
          "Server lisensi sedang tidak dapat dihubungi. Silakan coba kembali beberapa saat lagi.",
          start
        );
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();

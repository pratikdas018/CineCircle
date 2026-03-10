(function NotifyStackSDK() {
  var script = document.currentScript;
  if (!script) return;

  var websiteId = script.dataset.websiteId;
  var apiKey = script.dataset.apiKey;
  var explicitApiBase = script.dataset.apiBase;
  var scriptUrl = new URL(script.src, window.location.href);
  var apiBase = explicitApiBase || scriptUrl.origin;

  if (!websiteId) {
    // eslint-disable-next-line no-console
    console.error("NotifyStack SDK: data-website-id is required");
    return;
  }

  var loadScript = function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var existing = document.querySelector('script[src="' + src + '"]');
      if (existing) {
        resolve();
        return;
      }
      var tag = document.createElement("script");
      tag.src = src;
      tag.async = true;
      tag.onload = resolve;
      tag.onerror = reject;
      document.head.appendChild(tag);
    });
  };

  var fetchWebsiteConfig = function fetchWebsiteConfig() {
    return fetch(apiBase + "/api/public/websites/" + websiteId + "/config", {
      method: "GET",
      headers: {
        "ngrok-skip-browser-warning": "1",
      },
      credentials: "omit",
    }).then(function (response) {
      if (!response.ok) {
        throw new Error("Unable to load website config");
      }
      return response.json();
    });
  };

  var subscribeToken = function subscribeToken(token, resolvedApiKey) {
    return fetch(apiBase + "/api/public/subscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "1",
      },
      body: JSON.stringify({
        websiteId: websiteId,
        apiKey: resolvedApiKey,
        token: token,
        subscribedUrl: window.location.href,
      }),
    });
  };

  var init = function init() {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      return;
    }

    fetchWebsiteConfig()
      .then(function (configData) {
        var fcmConfig = configData.fcmConfig || {};
        var publicApiKey = apiKey || configData.apiKey;

        if (!fcmConfig.apiKey || !fcmConfig.projectId || !fcmConfig.messagingSenderId || !fcmConfig.appId) {
          throw new Error("Incomplete FCM config in website settings");
        }
        if (!publicApiKey) {
          throw new Error("Missing API key in SDK settings");
        }

        return Promise.all([
          loadScript("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js"),
          loadScript("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js"),
        ]).then(function () {
          if (!window.firebase.apps.length) {
            window.firebase.initializeApp(fcmConfig);
          }
          var messaging = window.firebase.messaging();

          return Notification.requestPermission().then(function (permission) {
            if (permission !== "granted") {
              throw new Error("Notification permission denied");
            }

            var swUrl =
              "/firebase-messaging-sw.js?apiBase=" +
              encodeURIComponent(apiBase) +
              "&websiteId=" +
              encodeURIComponent(websiteId) +
              "&apiKey=" +
              encodeURIComponent(fcmConfig.apiKey || "") +
              "&authDomain=" +
              encodeURIComponent(fcmConfig.authDomain || "") +
              "&projectId=" +
              encodeURIComponent(fcmConfig.projectId || "") +
              "&storageBucket=" +
              encodeURIComponent(fcmConfig.storageBucket || "") +
              "&messagingSenderId=" +
              encodeURIComponent(fcmConfig.messagingSenderId || "") +
              "&appId=" +
              encodeURIComponent(fcmConfig.appId || "") +
              "&measurementId=" +
              encodeURIComponent(fcmConfig.measurementId || "");

            return navigator.serviceWorker.register(swUrl).then(function (registration) {
              return messaging.getToken({
                vapidKey: fcmConfig.vapidKey,
                serviceWorkerRegistration: registration,
              });
            });
          }).then(function (token) {
            if (!token) return null;
            return subscribeToken(token, publicApiKey);
          });
        });
      })
      .catch(function (error) {
        // eslint-disable-next-line no-console
        console.error("NotifyStack SDK:", error.message || error);
      });
  };

  init();
})();


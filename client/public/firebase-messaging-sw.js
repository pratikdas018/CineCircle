/* eslint-disable no-undef */
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js");

var params = new URLSearchParams(self.location.search || "");
var apiBaseFromQuery = params.get("apiBase") || "";

var firebaseConfig = {
  apiKey: params.get("apiKey") || "",
  authDomain: params.get("authDomain") || "",
  projectId: params.get("projectId") || "",
  storageBucket: params.get("storageBucket") || "",
  messagingSenderId: params.get("messagingSenderId") || "",
  appId: params.get("appId") || "",
  measurementId: params.get("measurementId") || "",
};

if (!firebase.apps.length && firebaseConfig.apiKey && firebaseConfig.projectId) {
  firebase.initializeApp(firebaseConfig);
}

var messaging = firebase.apps.length ? firebase.messaging() : null;

var showNotificationFromPayload = function (payload) {
  var notification = payload.notification || {};
  var data = payload.data || {};
  var title = notification.title || data.title || "NotifyStack Notification";
  var body = notification.body || data.body || "";
  var icon = notification.icon || data.iconUrl || "/favicon.ico";
  var clickUrl = data.clickUrl || "/";

  return self.registration.showNotification(title, {
    body: body,
    icon: icon,
    data: {
      clickUrl: clickUrl,
      campaignId: data.campaignId || "",
      websiteId: data.websiteId || "",
      apiBase: data.apiBase || apiBaseFromQuery,
    },
  });
};

if (messaging) {
  messaging.onBackgroundMessage(function (payload) {
    showNotificationFromPayload(payload);
  });
}

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  var data = event.notification.data || {};
  var clickUrl = data.clickUrl || "/";
  var apiBase = data.apiBase || apiBaseFromQuery;

  event.waitUntil(
    (function () {
      var tasks = [];
      if (apiBase && data.websiteId && data.campaignId) {
        tasks.push(
          fetch(apiBase + "/api/public/track-click", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              websiteId: data.websiteId,
              campaignId: data.campaignId,
            }),
          }).catch(function () {})
        );
      }
      tasks.push(clients.openWindow(clickUrl));
      return Promise.all(tasks);
    })()
  );
});

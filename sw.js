self.addEventListener("push", (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch (error) {
    payload = {
      title: "Sakedo",
      body: event.data ? event.data.text() : "Bạn có thông báo mới."
    };
  }

  const title = payload.title || "Sakedo";
  const options = {
    body: payload.body || "Bạn có thông báo mới.",
    icon: payload.icon || "/assets/img/logo.png",
    badge: payload.badge || "/assets/img/logo.png",
    data: payload.data || {}
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = "/index.html";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes("/index.html") && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});

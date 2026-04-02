globalThis.browser = globalThis.browser || globalThis.chrome;
browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "GET") {
    const tabId = msg.tid || sender.tab.id;
    browser.storage.local.get(`t${tabId}`).then((r) => {
      sendResponse({ b: r[`t${tabId}`] || 1.0 });
    });
    return true;
  }
  if (msg.type === "SET") {
    browser.storage.local.set({ [`t${msg.tid}`]: msg.b });
    browser.tabs
      .sendMessage(msg.tid, { type: "UPD", b: msg.b })
      .catch(() => {});
  }
});
browser.tabs.onRemoved.addListener((tid) =>
  browser.storage.local.remove(`t${tid}`),
);

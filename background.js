globalThis.browser = globalThis.browser || globalThis.chrome;
browser.runtime.onMessage.addListener((m, s, sendResponse) => {
    if (m.type === 'GET') {
        browser.storage.local.get(`t${m.tid || s.tab.id}`).then(r => {
            sendResponse({ b: r[`t${m.tid || s.tab.id}`] || 1.0 });
        });
        return true;
    }
    if (m.type === 'SET') {
        browser.storage.local.set({ [`t${m.tid}`]: m.b });
        browser.tabs.sendMessage(m.tid, { type: 'UPD', b: m.b }).catch(() => { });
    }
});
browser.tabs.onRemoved.addListener(tid => browser.storage.local.remove(`t${tid}`));

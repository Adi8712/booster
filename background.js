browser.runtime.onMessage.addListener((m, s) => {
    if (m.type === 'GET') return browser.storage.local.get(`t${m.tid || s.tab.id}`).then(r => ({ b: r[`t${m.tid || s.tab.id}`] || 1.0 }));
    if (m.type === 'SET') {
        browser.storage.local.set({ [`t${m.tid}`]: m.b });
        browser.tabs.sendMessage(m.tid, { type: 'UPD', b: m.b }).catch(() => { });
    }
});
browser.tabs.onRemoved.addListener(tid => browser.storage.local.remove(`t${tid}`));

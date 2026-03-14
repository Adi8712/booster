browser.runtime.onInstalled.addListener(() =>
    browser.storage.local.get('boost').then(x => !x.boost && browser.storage.local.set({ boost: 1.0 }))
);

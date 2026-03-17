const s = document.getElementById('s'), p = document.getElementById('p'), r = document.getElementById('r');
const u = v => { s.value = v; p.innerHTML = Math.round(v * 100) + '<span>%</span>'; };
browser.tabs.query({ active: true, currentWindow: true }).then(t => {
    if (!t[0]) return;
    const tid = t[0].id;
    browser.runtime.sendMessage({ type: 'GET', tid }).then(x => u(x.b));
    s.addEventListener('input', e => {
        let v = parseFloat(e.target.value);
        u(v);
        browser.runtime.sendMessage({ type: 'SET', tid, b: v });
    });
    r.addEventListener('click', () => {
        u(1.0);
        browser.runtime.sendMessage({ type: 'SET', tid, b: 1.0 });
    });
});

const U = browser.runtime.getURL("worklet/processor.js");

(async () => {
    let b = 1.0;
    try { const r = await browser.storage.local.get({ boost: 1.0 }); b = r.boost || 1.0; } catch (e) { }
    const nds = new Set();
    let actx = null;

    function getCtx() {
        if (!actx) { actx = new window.AudioContext(); setCtx(actx); }
        return actx;
    }

    async function setCtx(c) {
        if (c._bi) return;
        c._bi = c.createGain();
        c._bo = c.createGain();
        c._bi.connect(c._bo);
        c._bo.connect(c.destination);
        try {
            await c.audioWorklet.addModule(U);
            const p = new window.AudioWorkletNode(c, 'processor');
            p.parameters.get('boost').value = b;
            c._bi.disconnect();
            c._bi.connect(p);
            p.connect(c._bo);
            nds.add(p);
        } catch (e) { }
    }

    const hk = el => {
        if (el._bHk) return;
        el._bHk = true;
        const tryHk = () => {
            if (el._bHkd) return;
            try {
                const c = getCtx();
                c.createMediaElementSource(el).connect(c._bi);
                el._bHkd = true;
            } catch (e) { }
        };
        el.addEventListener('play', tryHk, { once: true });
    };

    const obs = new MutationObserver(m => {
        for (let x of m) for (let n of x.addedNodes) {
            if (n instanceof HTMLMediaElement) hk(n);
            else if (n.querySelectorAll) n.querySelectorAll('audio,video').forEach(hk);
        }
    });

    const init = () => {
        document.querySelectorAll('audio,video').forEach(hk);
        if (document.body) obs.observe(document.body, { childList: true, subtree: true });
        else document.addEventListener('DOMContentLoaded', () => obs.observe(document.body, { childList: true, subtree: true }));
    };
    init();

    browser.storage.onChanged.addListener((c, a) => {
        if (a === 'local' && c.boost) {
            b = c.boost.newValue;
            for (let n of nds) {
                let p = n.parameters && n.parameters.get('boost');
                if (p) p.setTargetAtTime(b, n.context.currentTime, 0.01);
            }
            window.postMessage({ type: 'update', boost: b }, '*');
        }
    });
})();

browser.storage.local.get({ boost: 1.0 }).then(r => {
    const s = document.createElement('script');
    s.textContent = `
        (function () {
            let b = ${r.boost};
            const nds = new Set();
            async function setCtx(c) {
                if (c._bi) return;
                c._bi = c.createGain();
                c._bo = c.createGain();
                c._bi.connect(c._bo);
                c._bo.connect(c.destination);
                try {
                    await c.audioWorklet.addModule("${U}");
                    const p = new window.AudioWorkletNode(c, 'processor');
                    p.parameters.get('boost').value = b;
                    c._bi.disconnect();
                    c._bi.connect(p);
                    p.connect(c._bo);
                    nds.add(p);
                } catch (e) { }
            }
            function patch(C) {
                if (!C) return null;
                function P(...a) { const c = new C(...a); setCtx(c); return c; }
                P.prototype = C.prototype;
                return P;
            }
            if (window.AudioContext) window.AudioContext = patch(window.AudioContext);
            if (window.webkitAudioContext) window.webkitAudioContext = patch(window.webkitAudioContext);
            const oConn = AudioNode.prototype.connect;
            AudioNode.prototype.connect = function (...a) {
                const d = a[0];
                if (d && this.context && d === this.context.destination && this.context._bi) {
                    a[0] = this.context._bi;
                }
                return oConn.apply(this, a);
            };
            window.addEventListener('message', e => {
                if (e.source !== window || !e.data || e.data.type !== 'update') return;
                b = e.data.boost;
                for (let n of nds) {
                    let p = n.parameters && n.parameters.get('boost');
                    if (p) p.setTargetAtTime(b, n.context.currentTime, 0.01);
                }
            });
        })();
    `;
    (document.head || document.documentElement).appendChild(s);
    s.remove();
});

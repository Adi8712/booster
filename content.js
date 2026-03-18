globalThis.browser = globalThis.browser || globalThis.chrome;
const U = browser.runtime.getURL("worklet/processor.js");

browser.runtime.sendMessage({ type: "GET" }).then((r) => {
  let b = r.b;
  const nds = new Set();
  let actx = null;

  function getCtx() {
    if (!actx) {
      actx = new window.AudioContext();
      setCtx(actx);
    }
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
      const p = new window.AudioWorkletNode(c, "processor");
      p.parameters.get("boost").value = b;
      c._bi.disconnect();
      c._bi.connect(p);
      p.connect(c._bo);
      nds.add(p);
    } catch (e) {}
  }

  const hk = (el) => {
    if (el._bHk) return;
    el._bHk = true;

    try {
      const c = getCtx();
      if (!el._bHkd) {
        c.createMediaElementSource(el).connect(c._bi);
        el._bHkd = true;
      }
    } catch (e) {}

    el.addEventListener("play", () => {
      if (actx && actx.state === "suspended") {
        actx.resume().catch(() => {});
      }
    });
  };

  const obs = new MutationObserver((m) => {
    for (let x of m)
      for (let n of x.addedNodes) {
        if (n instanceof HTMLMediaElement) hk(n);
        else if (n.querySelectorAll)
          n.querySelectorAll("audio,video").forEach(hk);
      }
  });

  const init = () => {
    document.querySelectorAll("audio,video").forEach(hk);
    if (document.body)
      obs.observe(document.body, { childList: true, subtree: true });
    else
      document.addEventListener("DOMContentLoaded", () =>
        obs.observe(document.body, { childList: true, subtree: true }),
      );
  };
  init();

  browser.runtime.onMessage.addListener((m) => {
    if (m.type === "UPD") {
      b = m.b;
      for (let n of nds) {
        let p = n.parameters && n.parameters.get("boost");
        if (p) p.setTargetAtTime(b, n.context.currentTime, 0.01);
      }
      window.postMessage({ type: "UPD", b: b }, "*");
    }
  });

  const s = document.createElement("script");
  s.src = browser.runtime.getURL("script.js");
  s.dataset.b = b;
  s.dataset.u = U;
  s.onload = () => s.remove();
  (document.head || document.documentElement).appendChild(s);
});

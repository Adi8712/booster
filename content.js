if (!window.__booster) {
  window.__booster = true;
  globalThis.browser = globalThis.browser || globalThis.chrome;
  const workletUrl = browser.runtime.getURL("worklet/processor.js");

  browser.runtime.sendMessage({ type: "GET" }).then((res) => {
    let boost = res.b;
    const nodes = new Set();
    let audioCtx = null;

    function getCtx() {
      if (!audioCtx) {
        audioCtx = new window.AudioContext();
        setupCtx(audioCtx);
      }
      if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
      return audioCtx;
    }

    async function setupCtx(ctx) {
      if (ctx._bi) return;
      ctx._bi = ctx.createGain();
      ctx._bo = ctx.createGain();
      ctx._bi.connect(ctx._bo);
      ctx._bo.connect(ctx.destination);
      try {
        await ctx.audioWorklet.addModule(workletUrl);
        const proc = new window.AudioWorkletNode(ctx, "processor");
        proc.parameters.get("boost").value = boost;
        ctx._bi.connect(proc);
        proc.connect(ctx._bo);
        ctx._bi.disconnect(ctx._bo);
        nodes.add(proc);
      } catch (_) {}
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
    }

    function canCapture(el) {
      if (el.crossOrigin) return true;
      const src = el.currentSrc || el.src;
      if (!src) return true;
      try {
        return new URL(src, location.href).origin === location.origin;
      } catch (_) {
        return false;
      }
    }

    function hookElement(el) {
      if (el._bHk) return;
      el._bHk = true;

      if (canCapture(el)) {
        try {
          const ctx = getCtx();
          if (!el._bSrc) {
            ctx.createMediaElementSource(el).connect(ctx._bi);
            el._bSrc = true;
          }
        } catch (_) {}
      }

      el.addEventListener("play", () => {
        if (audioCtx && audioCtx.state === "suspended")
          audioCtx.resume().catch(() => {});
      });
    }

    const observer = new MutationObserver((mutations) => {
      for (const mut of mutations)
        for (const node of mut.addedNodes) {
          if (node.nodeType !== 1) continue;
          if (node instanceof HTMLMediaElement) hookElement(node);
          else node.querySelectorAll("audio,video").forEach(hookElement);
        }
    });

    document.querySelectorAll("audio,video").forEach(hookElement);
    if (document.body)
      observer.observe(document.body, { childList: true, subtree: true });
    else
      document.addEventListener("DOMContentLoaded", () =>
        observer.observe(document.body, { childList: true, subtree: true }),
      );

    browser.runtime.onMessage.addListener((msg) => {
      if (msg.type === "UPD") {
        boost = msg.b;
        for (const proc of nodes) {
          const param = proc.parameters && proc.parameters.get("boost");
          if (param)
            param.setTargetAtTime(boost, proc.context.currentTime, 0.01);
        }
        window.postMessage({ type: "UPD", b: boost }, "*");
      }
    });

    const script = document.createElement("script");
    script.src = browser.runtime.getURL("script.js");
    script.dataset.b = boost;
    script.dataset.u = workletUrl;
    script.onload = () => script.remove();
    (document.head || document.documentElement).appendChild(script);
  });
}

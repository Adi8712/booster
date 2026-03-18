(function () {
  const scriptTag = document.currentScript;
  let b = parseFloat(scriptTag.dataset.b) || 1.0;
  const U = scriptTag.dataset.u;
  const nds = new Set();

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

  function patch(C) {
    if (!C) return null;
    function P(...a) {
      const c = new C(...a);
      setCtx(c);
      return c;
    }
    P.prototype = C.prototype;
    return P;
  }

  if (window.AudioContext) window.AudioContext = patch(window.AudioContext);
  if (window.webkitAudioContext)
    window.webkitAudioContext = patch(window.webkitAudioContext);

  const oConn = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (...a) {
    const d = a[0];
    if (
      d &&
      this.context &&
      d === this.context.destination &&
      this.context._bi
    ) {
      a[0] = this.context._bi;
    }
    return oConn.apply(this, a);
  };

  window.addEventListener("message", (e) => {
    if (e.source !== window || !e.data || e.data.type !== "UPD") return;
    b = e.data.b;
    for (let n of nds) {
      let p = n.parameters && n.parameters.get("boost");
      if (p) p.setTargetAtTime(b, n.context.currentTime, 0.01);
    }
  });
})();

(function () {
  const tag = document.currentScript;
  let boost = parseFloat(tag.dataset.b) || 1.0;
  const workletUrl = tag.dataset.u;
  const nodes = new Set();
  const origConn = AudioNode.prototype.connect;

  async function setupCtx(ctx) {
    if (ctx._bi) return;
    ctx._bi = ctx.createGain();
    ctx._bo = ctx.createGain();
    origConn.call(ctx._bi, ctx._bo);
    origConn.call(ctx._bo, ctx.destination);
    try {
      await ctx.audioWorklet.addModule(workletUrl);
      const proc = new window.AudioWorkletNode(ctx, "processor");
      proc.parameters.get("boost").value = boost;
      origConn.call(ctx._bi, proc);
      origConn.call(proc, ctx._bo);
      ctx._bi.disconnect(ctx._bo);
      nodes.add(proc);
    } catch (_) {}
  }

  function patchCtor(Orig) {
    if (!Orig) return null;
    function Patched(...args) {
      const ctx = new Orig(...args);
      setupCtx(ctx);
      return ctx;
    }
    Patched.prototype = Orig.prototype;
    return Patched;
  }

  if (window.AudioContext) window.AudioContext = patchCtor(window.AudioContext);
  if (window.webkitAudioContext)
    window.webkitAudioContext = patchCtor(window.webkitAudioContext);

  AudioNode.prototype.connect = function (...args) {
    const dest = args[0];
    if (
      dest &&
      this.context &&
      dest === this.context.destination &&
      this.context._bi
    ) {
      args[0] = this.context._bi;
    }
    return origConn.apply(this, args);
  };

  window.addEventListener("message", (e) => {
    if (e.source !== window || !e.data || e.data.type !== "UPD") return;
    boost = e.data.b;
    for (const ref of nodes) {
      const param = ref.parameters && ref.parameters.get("boost");
      if (param) param.setTargetAtTime(boost, ref.context.currentTime, 0.01);
    }
  });
})();

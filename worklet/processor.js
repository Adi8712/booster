class BQ {
  constructor() {
    this.z1 = 0;
    this.z2 = 0;
    this.b0 = 1;
    this.b1 = 0;
    this.b2 = 0;
    this.a1 = 0;
    this.a2 = 0;
  }
  p(x) {
    const y = this.b0 * x + this.z1;
    this.z1 = this.b1 * x - this.a1 * y + this.z2;
    this.z2 = this.b2 * x - this.a2 * y;
    return y;
  }
}

const mkF = (type, fc, Q, dB) => {
  const f = new BQ();
  const w0 = (2 * Math.PI * fc) / sampleRate;
  const alpha = Math.sin(w0) / (2 * Q);
  const A = Math.pow(10, dB / 40);
  const cw = Math.cos(w0);
  let a0 = 1;

  if (type === "LP") {
    a0 = 1 + alpha;
    f.b0 = (1 - cw) / 2 / a0;
    f.b1 = (1 - cw) / a0;
    f.b2 = (1 - cw) / 2 / a0;
    f.a1 = (-2 * cw) / a0;
    f.a2 = (1 - alpha) / a0;
  } else if (type === "HP") {
    a0 = 1 + alpha;
    f.b0 = (1 + cw) / 2 / a0;
    f.b1 = -(1 + cw) / a0;
    f.b2 = (1 + cw) / 2 / a0;
    f.a1 = (-2 * cw) / a0;
    f.a2 = (1 - alpha) / a0;
  } else if (type === "LS") {
    const sa = 2 * Math.sqrt(A) * alpha;
    a0 = A + 1 + (A - 1) * cw + sa;
    f.b0 = (A * (A + 1 - (A - 1) * cw + sa)) / a0;
    f.b1 = (2 * A * (A - 1 - (A + 1) * cw)) / a0;
    f.b2 = (A * (A + 1 - (A - 1) * cw - sa)) / a0;
    f.a1 = (-2 * (A - 1 + (A + 1) * cw)) / a0;
    f.a2 = (A + 1 + (A - 1) * cw - sa) / a0;
  } else if (type === "HS") {
    const sa = 2 * Math.sqrt(A) * alpha;
    a0 = A + 1 - (A - 1) * cw + sa;
    f.b0 = (A * (A + 1 + (A - 1) * cw + sa)) / a0;
    f.b1 = (-2 * A * (A - 1 + (A + 1) * cw)) / a0;
    f.b2 = (A * (A + 1 + (A - 1) * cw - sa)) / a0;
    f.a1 = (2 * (A - 1 - (A + 1) * cw)) / a0;
    f.a2 = (A + 1 - (A - 1) * cw - sa) / a0;
  }
  return f;
};

class Processor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: "boost", defaultValue: 1.0, minValue: 0.1, maxValue: 10.0 },
    ];
  }

  constructor() {
    super();

    this.kPreL = mkF("HS", 1681.97, 0.7071, 4.0);
    this.kPreR = mkF("HS", 1681.97, 0.7071, 4.0);

    this.kRlbL = mkF("HP", 38.135, 0.5, 0);
    this.kRlbR = mkF("HP", 38.135, 0.5, 0);

    this.excLpL = mkF("LP", 150, 0.7071, 0);
    this.excLpR = mkF("LP", 150, 0.7071, 0);

    this.fmLSL = mkF("LS", 250, 0.7071, 6.0);
    this.fmHHL = mkF("HS", 4000, 0.7071, 3.0);
    this.fmLSR = mkF("LS", 250, 0.7071, 6.0);
    this.fmHHR = mkF("HS", 4000, 0.7071, 3.0);

    this.rms = 0;
    this.alphaRMS = Math.exp(-1 / (sampleRate * 0.4));

    this.peak = 0;
    this.g = 1.0;
  }

  process(inp, out, par) {
    const i0 = inp[0],
      o0 = out[0];
    if (!i0 || !i0[0]) return true;

    const parB = par.boost;
    const aRate = parB && parB.length > 1;
    let bst = parB ? parB[0] : 1.0;

    const iL = i0[0],
      iR = i0.length > 1 ? i0[1] : iL,
      oL = o0[0],
      oR = o0.length > 1 ? o0[1] : null;

    for (let j = 0; j < iL.length; j++) {
      if (aRate) bst = parB[j];

      const rawL = iL[j] * bst;
      const rawR = iR[j] * bst;

      const kwL = this.kRlbL.p(this.kPreL.p(rawL));
      const kwR = this.kRlbR.p(this.kPreR.p(rawR));
      const pwr = (kwL * kwL + kwR * kwR) * 0.5;

      if (pwr > 1e-8) {
        this.rms = pwr + this.alphaRMS * (this.rms - pwr);
      } else {
        this.rms *= 0.9995;
      }

      let eqMix = Math.max(0, 1.0 - Math.sqrt(this.rms * 150));

      const eqL = this.fmHHL.p(this.fmLSL.p(rawL));
      const eqR = this.fmHHR.p(this.fmLSR.p(rawR));

      const mainL = rawL * (1 - eqMix) + eqL * eqMix;
      const mainR = rawR * (1 - eqMix) + eqR * eqMix;

      const bL = this.excLpL.p(mainL);
      const bR = this.excLpR.p(mainR);

      const harmL = Math.tanh(bL * 4) - bL;
      const harmR = Math.tanh(bR * 4) - bR;

      const shapedL = mainL + harmL * 0.15;
      const shapedR = mainR + harmR * 0.15;

      const cp = Math.max(Math.abs(shapedL), Math.abs(shapedR));
      this.peak = cp > this.peak ? cp : cp + 0.999 * (this.peak - cp);

      const tgt = this.peak > 0.95 ? 0.95 / this.peak : 1.0;
      this.g += 0.005 * (tgt - this.g);

      oL[j] = Math.tanh(shapedL * this.g);
      if (oR) oR[j] = Math.tanh(shapedR * this.g);
    }

    if (this.rms < 1e-10) this.rms = 0;
    if (this.peak < 1e-10) this.peak = 0;
    if (Math.abs(this.g - 1.0) < 1e-10) this.g = 1.0;

    return true;
  }
}
registerProcessor("processor", Processor);

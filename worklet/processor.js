class Biquad {
  constructor() {
    this.z1 = 0;
    this.z2 = 0;
    this.b0 = 1;
    this.b1 = 0;
    this.b2 = 0;
    this.a1 = 0;
    this.a2 = 0;
  }
  run(x) {
    const y = this.b0 * x + this.z1;
    this.z1 = this.b1 * x - this.a1 * y + this.z2;
    this.z2 = this.b2 * x - this.a2 * y;
    return y;
  }
  reset() {
    this.z1 = 0;
    this.z2 = 0;
  }
}

const createFilter = (type, freq, Q, dB) => {
  const f = new Biquad();
  const w0 = (2 * Math.PI * freq) / sampleRate;
  const alpha = Math.sin(w0) / (2 * Q);
  const amp = Math.pow(10, dB / 40);
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
    const sa = 2 * Math.sqrt(amp) * alpha;
    a0 = amp + 1 + (amp - 1) * cw + sa;
    f.b0 = (amp * (amp + 1 - (amp - 1) * cw + sa)) / a0;
    f.b1 = (2 * amp * (amp - 1 - (amp + 1) * cw)) / a0;
    f.b2 = (amp * (amp + 1 - (amp - 1) * cw - sa)) / a0;
    f.a1 = (-2 * (amp - 1 + (amp + 1) * cw)) / a0;
    f.a2 = (amp + 1 + (amp - 1) * cw - sa) / a0;
  } else if (type === "HS") {
    const sa = 2 * Math.sqrt(amp) * alpha;
    a0 = amp + 1 - (amp - 1) * cw + sa;
    f.b0 = (amp * (amp + 1 + (amp - 1) * cw + sa)) / a0;
    f.b1 = (-2 * amp * (amp - 1 + (amp + 1) * cw)) / a0;
    f.b2 = (amp * (amp + 1 + (amp - 1) * cw - sa)) / a0;
    f.a1 = (2 * (amp - 1 - (amp + 1) * cw)) / a0;
    f.a2 = (amp + 1 - (amp - 1) * cw - sa) / a0;
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
    this.kPreL = createFilter("HS", 1681.97, 0.7071, 4.0);
    this.kPreR = createFilter("HS", 1681.97, 0.7071, 4.0);
    this.kRlbL = createFilter("HP", 38.135, 0.5, 0);
    this.kRlbR = createFilter("HP", 38.135, 0.5, 0);
    this.excLpL = createFilter("LP", 150, 0.7071, 0);
    this.excLpR = createFilter("LP", 150, 0.7071, 0);
    this.eqLsL = createFilter("LS", 250, 0.7071, 6.0);
    this.eqHsL = createFilter("HS", 4000, 0.7071, 3.0);
    this.eqLsR = createFilter("LS", 250, 0.7071, 6.0);
    this.eqHsR = createFilter("HS", 4000, 0.7071, 3.0);
    this.rms = 0;
    this.alphaRMS = Math.exp(-1 / (sampleRate * 0.4));
    this.peak = 0;
    this.gain = 1.0;
    this.passT = true;
  }

  resetState() {
    this.kPreL.reset();
    this.kPreR.reset();
    this.kRlbL.reset();
    this.kRlbR.reset();
    this.excLpL.reset();
    this.excLpR.reset();
    this.eqLsL.reset();
    this.eqHsL.reset();
    this.eqLsR.reset();
    this.eqHsR.reset();
    this.rms = 0;
    this.peak = 0;
    this.gain = 1.0;
  }

  process(inputs, outputs, params) {
    const inp = inputs[0],
      out = outputs[0];
    if (!inp || !inp[0]) return true;

    const boostParam = params.boost;
    const aRate = boostParam && boostParam.length > 1;
    let boost = boostParam ? boostParam[0] : 1.0;

    const inL = inp[0],
      inR = inp.length > 1 ? inp[1] : inL,
      outL = out[0],
      outR = out.length > 1 ? out[1] : null;
    const len = inL.length;

    if (!aRate && boost === 1.0) {
      this.passT = true;
      outL.set(inL);
      if (outR && inR !== inL) outR.set(inR);
      else if (outR) outR.set(inL);
      return true;
    }

    if (this.passT) {
      this.resetState();
      this.passT = false;
    }

    for (let i = 0; i < len; i++) {
      if (aRate) boost = boostParam[i];

      const rawL = inL[i] * boost;
      const rawR = inR[i] * boost;

      const kwL = this.kRlbL.run(this.kPreL.run(rawL));
      const kwR = this.kRlbR.run(this.kPreR.run(rawR));
      const pwr = (kwL * kwL + kwR * kwR) * 0.5;

      if (pwr > 1e-8) {
        this.rms = pwr + this.alphaRMS * (this.rms - pwr);
      } else {
        this.rms *= 0.9995;
      }

      let eqMix = Math.max(0, 1.0 - Math.sqrt(this.rms * 150));

      const eqL = this.eqHsL.run(this.eqLsL.run(rawL));
      const eqR = this.eqHsR.run(this.eqLsR.run(rawR));

      const mainL = rawL * (1 - eqMix) + eqL * eqMix;
      const mainR = rawR * (1 - eqMix) + eqR * eqMix;

      const bassL = this.excLpL.run(mainL);
      const bassR = this.excLpR.run(mainR);

      const harmL = Math.tanh(bassL * 4) - bassL;
      const harmR = Math.tanh(bassR * 4) - bassR;

      const shapedL = mainL + harmL * 0.15;
      const shapedR = mainR + harmR * 0.15;

      const cPeak = Math.max(Math.abs(shapedL), Math.abs(shapedR));
      this.peak =
        cPeak > this.peak ? cPeak : cPeak + 0.999 * (this.peak - cPeak);

      const target = this.peak > 0.95 ? 0.95 / this.peak : 1.0;
      this.gain += 0.005 * (target - this.gain);

      outL[i] = Math.tanh(shapedL * this.gain);
      if (outR) outR[i] = Math.tanh(shapedR * this.gain);
    }

    if (this.rms < 1e-10) this.rms = 0;
    if (this.peak < 1e-10) this.peak = 0;
    if (Math.abs(this.gain - 1.0) < 1e-10) this.gain = 1.0;

    return true;
  }
}
registerProcessor("processor", Processor);

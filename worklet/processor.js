class Processor extends AudioWorkletProcessor {
    static get parameterDescriptors() {
        return [{ name: 'boost', defaultValue: 1.0, minValue: 0.1, maxValue: 10.0 }];
    }
    constructor() {
        super();
        this.buff = new Float32Array(512);
        this.idx = 0;
        this.e = 0;
        this.g = 1.0;
    }
    process(inp, out, par) {
        const i0 = inp[0], o0 = out[0];
        if (!i0 || !i0[0]) return true;

        const parB = par.boost;
        const bLen = parB ? parB.length : 0;
        const aRate = bLen > 1;
        let bst = bLen > 0 ? parB[0] : 1.0;

        const iL = i0[0], iR = i0.length > 1 ? i0[1] : iL, oL = o0[0], oR = o0.length > 1 ? o0[1] : null;

        for (let j = 0; j < iL.length; j++) {
            if (aRate) bst = parB[j];
            let p = Math.max(Math.abs(iL[j]), Math.abs(iR[j])) * bst;
            this.e += (p > this.e ? 0.005 : 0.0005) * (p - this.e);
            this.g += 0.001 * ((this.e > 0.9 ? 0.9 / this.e : 1.0) - this.g);
            let dL = this.buff[this.idx], dR = this.buff[this.idx + 1];
            this.buff[this.idx] = iL[j] * bst; this.buff[this.idx + 1] = iR[j] * bst;
            this.idx = (this.idx + 2) & 511;
            let vL = dL * this.g, vR = dR * this.g;
            oL[j] = vL < -1.2 ? -1.0 : (vL > 1.2 ? 1.0 : vL - 0.3333 * vL * vL * vL);

            if (oR) {
                oR[j] = vR < -1.2 ? -1.0 : (vR > 1.2 ? 1.0 : vR - 0.3333 * vR * vR * vR);
            }
        }
        return true;
    }
}
registerProcessor('processor', Processor);

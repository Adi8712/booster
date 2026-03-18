class Processor extends AudioWorkletProcessor {
    static get parameterDescriptors() {
        return [{ name: 'boost', defaultValue: 1.0, minValue: 0.1, maxValue: 10.0 }];
    }

    constructor() {
        super();
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

        const iL = i0[0], iR = i0.length > 1 ? i0[1] : iL,
            oL = o0[0], oR = o0.length > 1 ? o0[1] : null;

        for (let j = 0; j < iL.length; j++) {
            if (aRate) bst = parB[j];

            const l = iL[j] * bst;
            const r = iR[j] * bst;

            const p = Math.max(Math.abs(l), Math.abs(r));
            this.e = p > this.e ? p : p + 0.999 * (this.e - p);

            const target = this.e > 0.9 ? 0.9 / this.e : 1.0;
            this.g += 0.005 * (target - this.g);

            let vL = l * this.g;
            oL[j] = vL < -1.15 ? -1.0 : (vL > 1.15 ? 1.0 : vL - (vL * vL * vL) / 3);

            if (oR) {
                let vR = r * this.g;
                oR[j] = vR < -1.15 ? -1.0 : (vR > 1.15 ? 1.0 : vR - (vR * vR * vR) / 3);
            }
        }

        if (this.e < 1e-8) this.e = 0;
        if (Math.abs(this.g - 1.0) < 1e-8) this.g = 1.0;

        return true;
    }
}
registerProcessor('processor', Processor);

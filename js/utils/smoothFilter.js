// One Euro Filter - for ultra smooth, low jitter tracking
// Based on Gery Casiez - https://hal.inria.fr/hal-00900607/

export class OneEuroFilter {
  constructor(freq = 60, minCutoff = 1.2, beta = 0.007, dCutoff = 1.0){
    this.freq = freq;
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
    this.xPrev = null;
    this.dxPrev = null;
    this.tPrev = null;
  }
  _alpha(cutoff){
    const te = 1.0 / this.freq;
    const tau = 1.0 / (2 * Math.PI * cutoff);
    return 1.0 / (1.0 + tau / te);
  }
  filter(value, timestamp = performance.now()){
    if(this.tPrev === null){
      this.xPrev = value;
      this.dxPrev = 0;
      this.tPrev = timestamp;
      return value;
    }
    const dt = (timestamp - this.tPrev) / 1000;
    if(dt <= 0) return this.xPrev;
    this.freq = 1.0 / dt;

    const dx = (value - this.xPrev) / dt;
    const edx = this._alpha(this.dCutoff);
    const edxFilt = edx * dx + (1 - edx) * this.dxPrev;

    const cutoff = this.minCutoff + this.beta * Math.abs(edxFilt);
    const alpha = this._alpha(cutoff);
    const xFilt = alpha * value + (1 - alpha) * this.xPrev;

    this.xPrev = xFilt;
    this.dxPrev = edxFilt;
    this.tPrev = timestamp;
    return xFilt;
  }
}

export class LandmarkSmoother {
  constructor(){
    this.filtersX = [];
    this.filtersY = [];
    this.count = 21;
    for(let i=0;i<this.count;i++){
      this.filtersX.push(new OneEuroFilter(60, 1.1, 0.02, 1.0));
      this.filtersY.push(new OneEuroFilter(60, 1.1, 0.02, 1.0));
    }
  }
  smooth(landmarks, now){
    if(!landmarks || landmarks.length===0) return landmarks;
    return landmarks.map((lm,i)=>{
      if(i>=this.count) return lm;
      return {
        ...lm,
        x: this.filtersX[i].filter(lm.x, now),
        y: this.filtersY[i].filter(lm.y, now),
        z: lm.z
      };
    });
  }
  reset(){
    this.filtersX.forEach(f=>{f.xPrev=null;f.tPrev=null;});
    this.filtersY.forEach(f=>{f.xPrev=null;f.tPrev=null;});
  }
}

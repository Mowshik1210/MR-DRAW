import { clamp } from '../../utils/helpers.js';

const HAND_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [0,9],[9,10],[10,11],[11,12],
  [0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20],
  [5,9],[9,13],[13,17]
];

export class VoidRenderer {
  constructor({videoEl, handCanvas, maskCanvas}){
    this.video = videoEl;
    this.canvas = handCanvas;
    this.ctx = handCanvas.getContext('2d', {alpha:true, desynchronized:true});
    this.maskCanvas = maskCanvas;
    this.maskCtx = maskCanvas.getContext('2d', {alpha:true});
    this.solidCanvas = document.createElement('canvas');
    this.solidCtx = this.solidCanvas.getContext('2d', {alpha:true});
    this.dpr = Math.min(window.devicePixelRatio||1, 1.8);
    this.hands = [];
    this._resize();
    window.addEventListener('resize', ()=>this._resize());
  }

  _resize(){
    const w = window.innerWidth;
    const h = window.innerHeight;
    [this.canvas, this.maskCanvas, this.solidCanvas].forEach(c=>{
      c.width = Math.floor(w * this.dpr);
      c.height = Math.floor(h * this.dpr);
      c.style.width = w+'px';
      c.style.height = h+'px';
    });
    this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);
    this.maskCtx.setTransform(this.dpr,0,0,this.dpr,0,0);
    this.solidCtx.setTransform(this.dpr,0,0,this.dpr,0,0);
    this.W = w;
    this.H = h;
    this.cover = this._computeCover();
  }

  _computeCover(){
    const vw = this.video.videoWidth || 1280;
    const vh = this.video.videoHeight || 720;
    const W = this.W, H = this.H;
    const videoAR = vw / vh;
    const canvasAR = W / H;
    let dw, dh, dx, dy;
    if(canvasAR > videoAR){
      dw = W;
      dh = W / videoAR;
      dx = 0;
      dy = (H - dh)/2;
    }else{
      dh = H;
      dw = H * videoAR;
      dx = (W - dw)/2;
      dy = 0;
    }
    return {dx,dy,dw,dh, vw,vh};
  }

  setHands(hands){
    this.hands = hands;
    this.cover = this._computeCover();
  }

  _mapToScreen(landmark, mirrored=true){
    const {dx,dy,dw,dh} = this.cover;
    const x = dx + landmark.x * dw;
    const y = dy + landmark.y * dh;
    return {
      x: mirrored ? (this.W - x) : x,
      y
    };
  }

  _palmSize(hand){
    const a = this._mapToScreen(hand[0], false);
    const b = this._mapToScreen(hand[9], false);
    return Math.hypot(a.x-b.x, a.y-b.y);
  }

  renderMask(){
    const W = this.W, H = this.H;
    const sCtx = this.solidCtx;
    const mCtx = this.maskCtx;
    sCtx.clearRect(0,0,W,H);
    mCtx.clearRect(0,0,W,H);
    if(this.hands.length===0) return;
    sCtx.save();
    sCtx.fillStyle='#fff';
    sCtx.strokeStyle='#fff';
    sCtx.lineCap='round';
    sCtx.lineJoin='round';
    for(const hand of this.hands){
      const palmPx = this._palmSize(hand);
      const baseWidth = clamp(palmPx*0.32, 14, 34);
      sCtx.lineWidth = baseWidth;
      sCtx.beginPath();
      for(const [a,b] of HAND_CONNECTIONS){
        const pa = hand[a], pb = hand[b];
        if(!pa||!pb) continue;
        const p0 = this._mapToScreen(pa, true);
        const p1 = this._mapToScreen(pb, true);
        sCtx.moveTo(p0.x, p0.y);
        sCtx.lineTo(p1.x, p1.y);
      }
      sCtx.stroke();
      const palmIdx=[0,1,2,5,9,13,17];
      sCtx.beginPath();
      palmIdx.forEach((idx,i)=>{
        const lm = hand[idx];
        if(!lm) return;
        const p=this._mapToScreen(lm,true);
        if(i===0) sCtx.moveTo(p.x,p.y); else sCtx.lineTo(p.x,p.y);
      });
      sCtx.closePath();
      sCtx.fill();
      hand.forEach((lm,i)=>{
        const p=this._mapToScreen(lm,true);
        const r = i===0? baseWidth*0.65 : baseWidth*0.38;
        sCtx.beginPath();
        sCtx.arc(p.x,p.y,r,0,Math.PI*2);
        sCtx.fill();
      });
    }
    sCtx.restore();
    mCtx.save();
    mCtx.filter='blur(14px)';
    mCtx.drawImage(this.solidCanvas, 0,0, W, H);
    mCtx.filter='blur(7px)';
    mCtx.globalAlpha=0.85;
    mCtx.drawImage(this.solidCanvas, 0,0, W, H);
    mCtx.restore();
    mCtx.globalAlpha=1;
    mCtx.drawImage(this.solidCanvas, 0,0,W,H);
  }

  renderHand(){
    const ctx = this.ctx;
    const W = this.W, H = this.H;
    const {dx,dy,dw,dh} = this.cover;
    ctx.clearRect(0,0,W,H);
    if(this.hands.length===0) return;
    ctx.save();
    ctx.translate(W,0);
    ctx.scale(-1,1);
    ctx.drawImage(this.video, dx, dy, dw, dh);
    ctx.restore();
    ctx.save();
    ctx.globalCompositeOperation='destination-in';
    ctx.drawImage(this.maskCanvas, 0,0,W,H);
    ctx.restore();
  }

  getScreenPos(lm, mirrored=true){ return this._mapToScreen(lm,mirrored); }

  getFingertips(){
    const tips=[];
    const idxs=[4,8,12,16,20];
    for(const hand of this.hands){
      idxs.forEach(i=>{
        if(hand[i]) tips.push(this._mapToScreen(hand[i], true));
      });
    }
    return tips;
  }

  getPalmCenter(){
    if(this.hands.length===0) return null;
    return this._mapToScreen(this.hands[0][9], true);
  }

  getIndexTip(){
    if(this.hands.length===0) return null;
    const t=this.hands[0][8]; if(!t) return null;
    return this._mapToScreen(t,true);
  }

  getThumbTip(){
    if(this.hands.length===0) return null;
    const t=this.hands[0][4]; if(!t) return null;
    return this._mapToScreen(t,true);
  }

  getPinchInfo(){
    if(this.hands.length===0) return null;
    const hand=this.hands[0];
    const thumb=hand[4], index=hand[8];
    if(!thumb||!index) return null;
    const dx=thumb.x-index.x, dy=thumb.y-index.y;
    const dist=Math.hypot(dx,dy);
    const zDiff=Math.abs((thumb.z||0)-(index.z||0));
    const tp = this._mapToScreen(thumb,true);
    const ip = this._mapToScreen(index,true);
    const screenDist = Math.hypot(tp.x-ip.x, tp.y-ip.y);
    const palmPx = this._palmSize(hand);
    return {dist, screenDist, palmPx, zDiff, thumb, index, ratio: palmPx? screenDist/palmPx : dist*4 };
  }

  // --- Gesture helpers for reliable lift ---
  _dist(a,b){
    return Math.hypot(a.x-b.x, a.y-b.y, (a.z||0)-(b.z||0));
  }

  isFingerExtended(hand, tipIdx, pipIdx, mcpIdx){
    // extended if tip far from wrist vs pip/mcp
    const wrist = hand[0];
    const tip = hand[tipIdx];
    const pip = hand[pipIdx];
    const mcp = hand[mcpIdx];
    if(!tip||!pip||!mcp||!wrist) return false;
    const dTipW = this._dist(tip,wrist);
    const dPipW = this._dist(pip,wrist);
    const dMcpW = this._dist(mcp,wrist);
    // extended if tip > pip > mcp with some margin
    return dTipW > dPipW*1.08 && dTipW > dMcpW*1.15;
  }

  getGesture(){
    if(this.hands.length===0) return {type:'none'};
    const hand=this.hands[0];

    const idxExt = this.isFingerExtended(hand,8,6,5);
    const midExt = this.isFingerExtended(hand,12,10,9);
    const ringExt = this.isFingerExtended(hand,16,14,13);
    const pinkyExt = this.isFingerExtended(hand,20,18,17);
    // thumb extended roughly if tip away from index mcp
    const thumb = hand[4], iMcp=hand[5];
    let thumbExt = false;
    if(thumb&&iMcp){
      thumbExt = this._dist(thumb, hand[0]) > this._dist(iMcp, hand[0])*0.9;
    }

    const pinchInfo = this.getPinchInfo();
    const pinchRatio = pinchInfo ? pinchInfo.ratio : 1;
    const pinchDist = pinchInfo ? pinchInfo.dist : 1;

    const isPinching = pinchDist < 0.07 && pinchRatio < 0.55;
    const isPointing = idxExt && !midExt && !ringExt && !pinkyExt;
    const isOpen = idxExt && midExt && ringExt && pinkyExt && !isPinching;
    const isFist = !idxExt && !midExt && !ringExt && !pinkyExt;

    let type='none';
    if(isPinching) type='pinch';
    else if(isPointing) type='point';
    else if(isOpen) type='open';
    else if(isFist) type='fist';

    return {
      type,
      isPinching,
      isPointing,
      isOpen,
      isFist,
      idxExt, midExt, ringExt, pinkyExt, thumbExt,
      pinchInfo,
      pinchRatio,
      pinchDist
    };
  }
}

import { clamp } from '../../utils/helpers.js';

export const NEON_COLORS = [
  { id:'cyan',   label:'CYAN',   hex:'#7CFFCB', rgb:'124,255,203' },
  { id:'blue',   label:'BLUE',   hex:'#4EA3FF', rgb:'78,163,255' },
  { id:'green',  label:'GREEN',  hex:'#3CFF6B', rgb:'60,255,107' },
  { id:'pink',   label:'PINK',   hex:'#FF7CCF', rgb:'255,124,207' },
  { id:'purple', label:'PURPLE', hex:'#8A7CFF', rgb:'138,124,255' },
  { id:'red',    label:'RED',    hex:'#FF3B5C', rgb:'255,59,92' },
  { id:'orange', label:'ORANGE', hex:'#FF8A3D', rgb:'255,138,61' },
  { id:'yellow', label:'YELLOW', hex:'#FFEB3B', rgb:'255,235,59' },
  { id:'white',  label:'WHITE',  hex:'#FFFFFF', rgb:'255,255,255' },
];

export class DrawingManager {
  constructor({glowCanvas, coreCanvas, liveCanvas}){
    this.glowCanvas = glowCanvas;
    this.coreCanvas = coreCanvas;
    this.liveCanvas = liveCanvas;
    this.glowCtx = glowCanvas.getContext('2d', {alpha:true});
    this.coreCtx = coreCanvas.getContext('2d', {alpha:true});
    this.liveCtx = liveCanvas.getContext('2d', {alpha:true});
    this.dpr = Math.min(window.devicePixelRatio||1, 1.8);
    this.strokes = [];
    this.currentStroke = null;
    this.currentColor = NEON_COLORS[0];
    this.brushSize = 3.5;
    // for moving
    this.moveMode = false;
    this._resize();
    window.addEventListener('resize', ()=>this._resize());
  }

  _resize(){
    const w = window.innerWidth, h = window.innerHeight;
    [this.glowCanvas, this.coreCanvas, this.liveCanvas].forEach(c=>{
      c.width = Math.floor(w*this.dpr);
      c.height = Math.floor(h*this.dpr);
      c.style.width = w+'px';
      c.style.height = h+'px';
    });
    this.glowCtx.setTransform(this.dpr,0,0,this.dpr,0,0);
    this.coreCtx.setTransform(this.dpr,0,0,this.dpr,0,0);
    this.liveCtx.setTransform(this.dpr,0,0,this.dpr,0,0);
    this.W=w; this.H=h;
    this._redrawAll();
  }

  setColor(colorObj){
    this.currentColor = colorObj;
    document.documentElement.style.setProperty('--neon', colorObj.hex);
  }

  setMoveMode(enabled){
    this.moveMode = enabled;
    return this.moveMode;
  }

  startStroke(point){
    this.currentStroke = {
      points:[point],
      color:{...this.currentColor},
      size: this.brushSize,
      id: Date.now()+Math.random()
    };
    this._clearLive();
  }

  addPoint(point){
    if(!this.currentStroke) return;
    const pts = this.currentStroke.points;
    const last = pts[pts.length-1];
    const d = Math.hypot(point.x-last.x, point.y-last.y);
    if(d < 1.0) return;
    pts.push(point);
    this._drawLiveSegment(last, point);
  }

  endStroke(){
    if(!this.currentStroke) return;
    const s = this.currentStroke;
    if(s.points.length < 2){
      s.points.push({x:s.points[0].x+0.1, y:s.points[0].y+0.1, z:s.points[0].z});
    }
    this.strokes.push(s);
    this.currentStroke = null;
    this._clearLive();
    this._drawStrokeToPersistent(s);
    return s;
  }

  cancelStroke(){
    this.currentStroke = null;
    this._clearLive();
  }

  _clearLive(){
    this.liveCtx.clearRect(0,0,this.W,this.H);
  }

  _drawLiveSegment(p0,p1){
    const ctx = this.liveCtx;
    const col = this.currentColor;
    const rgb = col.rgb;
    const avgZ = (p0.z + p1.z)/2;
    const depthFactor = clamp(1 - (avgZ+0.15)*2, 0.6, 1.6);
    ctx.save();
    ctx.lineCap='round';
    ctx.lineJoin='round';
    ctx.shadowColor = `rgba(${rgb},0.9)`;
    ctx.shadowBlur = 22 * depthFactor;
    ctx.strokeStyle = `rgba(${rgb},0.85)`;
    ctx.lineWidth = 14 * depthFactor;
    ctx.beginPath();
    ctx.moveTo(p0.x,p0.y);
    ctx.lineTo(p1.x,p1.y);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3 * depthFactor;
    ctx.globalAlpha = 0.95;
    ctx.beginPath();
    ctx.moveTo(p0.x,p0.y);
    ctx.lineTo(p1.x,p1.y);
    ctx.stroke();
    ctx.strokeStyle = col.hex;
    ctx.lineWidth = 2.2 * depthFactor;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.moveTo(p0.x,p0.y);
    ctx.lineTo(p1.x,p1.y);
    ctx.stroke();
    ctx.restore();
  }

  _drawStrokeToPersistent(stroke){
    this._renderStroke(this.glowCtx, this.coreCtx, stroke);
  }

  _renderStroke(gCtx, cCtx, stroke){
    const pts = stroke.points;
    if(pts.length<2) return;
    const rgb = stroke.color.rgb;
    const hex = stroke.color.hex;

    const drawPath = (ctx, width, shadowBlur, color, alpha=1, composite='source-over')=>{
      ctx.save();
      ctx.lineCap='round';
      ctx.lineJoin='round';
      ctx.globalCompositeOperation = composite;
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = shadowBlur;
      ctx.lineWidth = width;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for(let i=1;i<pts.length;i++){
        const p0 = pts[i-1];
        const p1 = pts[i];
        const mx = (p0.x + p1.x)/2;
        const my = (p0.y + p1.y)/2;
        if(i===1) ctx.lineTo(mx,my);
        else ctx.quadraticCurveTo(p0.x,p0.y,mx,my);
      }
      ctx.lineTo(pts[pts.length-1].x, pts[pts.length-1].y);
      ctx.stroke();
      ctx.restore();
    };

    drawPath(gCtx, 18, 32, `rgba(${rgb},0.9)`, 0.95, 'screen');
    drawPath(gCtx, 10, 18, `rgba(${rgb},0.7)`, 0.7, 'screen');
    drawPath(cCtx, 3.8, 0, '#ffffff', 0.98);
    drawPath(cCtx, 2.6, 0, hex, 0.95);
  }

  _redrawAll(){
    if(!this.glowCtx) return;
    this.glowCtx.clearRect(0,0,this.W,this.H);
    this.coreCtx.clearRect(0,0,this.W,this.H);
    for(const s of this.strokes){
      this._renderStroke(this.glowCtx, this.coreCtx, s);
    }
  }

  // --- Move / Lift functionality ---
  // Translate all strokes by delta
  translateAll(dx, dy){
    if(this.strokes.length===0) return;
    for(const s of this.strokes){
      for(const p of s.points){
        p.x += dx;
        p.y += dy;
      }
    }
    this._redrawAll();
  }

  // Translate last stroke only (to lift a single drawing)
  translateLast(dx, dy){
    if(this.strokes.length===0) return;
    const s = this.strokes[this.strokes.length-1];
    for(const p of s.points){
      p.x += dx;
      p.y += dy;
    }
    this._redrawAll();
    return s;
  }

  // Check if a point is near any drawing (for grab)
  isNearDrawing(x,y, threshold=48){
    for(let i=this.strokes.length-1;i>=0;i--){
      const s=this.strokes[i];
      for(const p of s.points){
        if(Math.hypot(p.x-x, p.y-y) < threshold) return {stroke:s, index:i};
      }
    }
    return null;
  }

  undo(){
    if(this.strokes.length===0) return false;
    this.strokes.pop();
    this._redrawAll();
    return true;
  }

  clear(){
    this.strokes.length=0;
    this.currentStroke=null;
    this.glowCtx.clearRect(0,0,this.W,this.H);
    this.coreCtx.clearRect(0,0,this.W,this.H);
    this.liveCtx.clearRect(0,0,this.W,this.H);
  }

  getCount(){ return this.strokes.length; }
}

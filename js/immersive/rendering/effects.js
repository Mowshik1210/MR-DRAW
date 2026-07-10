// Higher level coordinator for shape creation (placeholder for future drawing tools)
// Currently implements subtle reactive shape burst when hand moves fast

export class ShapeReactor {
  constructor(canvas){
    this.canvas=canvas;
    this.ctx=canvas.getContext('2d');
    this.shapes=[];
    this.dpr=Math.min(devicePixelRatio||1,2);
    this._resize();
    addEventListener('resize',()=>this._resize());
  }
  _resize(){
    const w=innerWidth,h=innerHeight;
    this.canvas.width=w*this.dpr;
    this.canvas.height=h*this.dpr;
    this.canvas.style.width=w+'px';
    this.canvas.style.height=h+'px';
    this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);
    this.W=w;this.H=h;
  }
  burstAt(x,y, speed=0){
    if(speed<8) return; // only fast flicks
    const count = Math.min(3, Math.floor(speed/14)+1);
    for(let i=0;i<count;i++){
      const ang = Math.random()*Math.PI*2;
      const r = 18 + Math.random()*32 + speed*0.6;
      this.shapes.push({
        x,y,
        r:0,
        targetR:r,
        rot: ang,
        lineW: Math.random()*1.2+0.6,
        alpha:1,
        decay:0.014+Math.random()*0.01,
        type: Math.random()>0.66?'circle': Math.random()>0.5?'rect':'tri',
        col: Math.random()>0.5?'124,255,203':'138,124,255'
      });
    }
  }
  render(){
    const ctx=this.ctx;
    ctx.clearRect(0,0,this.W,this.H);
    for(let i=this.shapes.length-1;i>=0;i--){
      const s=this.shapes[i];
      s.r += (s.targetR - s.r)*0.12;
      s.alpha -= s.decay;
      if(s.alpha<=0){ this.shapes.splice(i,1); continue; }
      ctx.save();
      ctx.translate(s.x,s.y);
      ctx.rotate(s.rot);
      ctx.globalAlpha = s.alpha;
      ctx.strokeStyle = `rgba(${s.col},${s.alpha})`;
      ctx.lineWidth = s.lineW;
      ctx.shadowBlur = 12*s.alpha;
      ctx.shadowColor = `rgba(${s.col},${s.alpha})`;
      ctx.beginPath();
      if(s.type==='circle'){
        ctx.arc(0,0,s.r,0,Math.PI*2);
      }else if(s.type==='rect'){
        ctx.rect(-s.r,-s.r,s.r*2,s.r*2);
      }else{
        // triangle
        const r=s.r;
        ctx.moveTo(0,-r);
        ctx.lineTo(r*0.866,r*0.5);
        ctx.lineTo(-r*0.866,r*0.5);
        ctx.closePath();
      }
      ctx.stroke();
      ctx.restore();
    }
  }
}

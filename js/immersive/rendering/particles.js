// Floating dust - background
export class DustField {
  constructor(canvas){
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', {alpha:true});
    this.dpr = Math.min(window.devicePixelRatio||1,2);
    this.particles = [];
    this._resize();
    window.addEventListener('resize', ()=>this._resize());
    this._init();
  }
  _resize(){
    const w = window.innerWidth, h = window.innerHeight;
    this.canvas.width = w*this.dpr;
    this.canvas.height = h*this.dpr;
    this.canvas.style.width = w+'px';
    this.canvas.style.height = h+'px';
    this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);
    this.W=w; this.H=h;
  }
  _init(){
    const count = Math.floor((this.W*this.H)/28000); // density
    this.particles = [];
    for(let i=0;i<Math.max(40, count);i++){
      this.particles.push({
        x: Math.random()*this.W,
        y: Math.random()*this.H,
        r: Math.random()*1.6+0.2,
        vx: (Math.random()-0.5)*0.15,
        vy: (Math.random()-0.5)*0.12,
        alpha: Math.random()*0.5+0.15,
        twinkle: Math.random()*Math.PI*2,
        color: Math.random()>0.6? '124,255,203' : Math.random()>0.5?'138,124,255':'255,255,255'
      });
    }
  }
  render(dt, handCenter){
    const ctx = this.ctx;
    ctx.clearRect(0,0,this.W,this.H);
    const t = performance.now()*0.001;
    for(const p of this.particles){
      // slight attraction to hand if near
      if(handCenter){
        const dx = handCenter.x - p.x;
        const dy = handCenter.y - p.y;
        const d = Math.hypot(dx,dy);
        if(d<280){
          const f = (1 - d/280)*0.02;
          p.vx += dx*0.0004*f;
          p.vy += dy*0.0004*f;
          p.alpha = Math.min(1, p.alpha + (1-d/280)*0.4);
        }
      }
      p.x += p.vx;
      p.y += p.vy;
      p.twinkle += 0.02;
      // wrap
      if(p.x< -10) p.x=this.W+10;
      if(p.x> this.W+10) p.x=-10;
      if(p.y< -10) p.y=this.H+10;
      if(p.y> this.H+10) p.y=-10;

      // draw
      const a = p.alpha * (0.7 + Math.sin(p.twinkle)*0.3);
      ctx.beginPath();
      ctx.fillStyle = `rgba(${p.color},${a})`;
      ctx.shadowColor = `rgba(${p.color},${a})`;
      ctx.shadowBlur = p.r*4;
      ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }
}

// Glow trails following hand
export class TrailRenderer {
  constructor(canvas){
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d',{alpha:true});
    this.dpr = Math.min(window.devicePixelRatio||1,2);
    this.history = []; // [{x,y,t,speed}]
    this.maxLen = 24;
    this._resize();
    window.addEventListener('resize',()=>this._resize());
  }
  _resize(){
    const w=window.innerWidth,h=window.innerHeight;
    this.canvas.width = w*this.dpr;
    this.canvas.height = h*this.dpr;
    this.canvas.style.width=w+'px';
    this.canvas.style.height=h+'px';
    this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);
    this.W=w;this.H=h;
  }
  addPoint(p){
    const now = performance.now();
    const last = this.history[this.history.length-1];
    let speed = 0;
    if(last){
      speed = Math.hypot(p.x-last.x, p.y-last.y);
    }
    this.history.push({x:p.x,y:p.y,t:now,speed});
    if(this.history.length>this.maxLen) this.history.shift();
  }
  clear(){
    this.history.length=0;
  }
  render(enabled, colorMode=0){
    const ctx = this.ctx;
    ctx.clearRect(0,0,this.W,this.H);
    if(!enabled || this.history.length<2) return;

    ctx.lineCap='round';
    ctx.lineJoin='round';

    // glow layer
    for(let pass=0; pass<2; pass++){
      ctx.beginPath();
      const isGlow = pass===0;
      ctx.lineWidth = isGlow? 28 : 3;
      ctx.shadowBlur = isGlow? 28 : 0;
      ctx.shadowColor = isGlow? 'rgba(124,255,203,0.9)' : 'transparent';
      ctx.globalAlpha = isGlow? 0.22 : 0.9;
      if(isGlow){
        ctx.strokeStyle = '#7cffcb';
      } else {
        const grad = ctx.createLinearGradient(
          this.history[0].x,this.history[0].y,
          this.history[this.history.length-1].x,this.history[this.history.length-1].y
        );
        grad.addColorStop(0,'rgba(138,124,255,0.0)');
        grad.addColorStop(0.5,'rgba(124,255,203,0.9)');
        grad.addColorStop(1,'rgba(255,255,255,1)');
        ctx.strokeStyle = grad;
      }

      for(let i=0;i<this.history.length-1;i++){
        const p0 = this.history[i];
        const p1 = this.history[i+1];
        if(i===0) ctx.moveTo(p0.x,p0.y);
        // quadratic for smoothness
        const mx = (p0.x+p1.x)/2;
        const my = (p0.y+p1.y)/2;
        ctx.quadraticCurveTo(p0.x,p0.y,mx,my);
      }
      const last = this.history[this.history.length-1];
      ctx.lineTo(last.x,last.y);
      ctx.stroke();
    }
    ctx.shadowBlur=0;
    ctx.globalAlpha=1;

    // fingertip bloom dot
    const head = this.history[this.history.length-1];
    if(head){
      const g = ctx.createRadialGradient(head.x,head.y,0,head.x,head.y,22);
      g.addColorStop(0,'rgba(255,255,255,0.95)');
      g.addColorStop(0.2,'rgba(124,255,203,0.6)');
      g.addColorStop(1,'rgba(124,255,203,0)');
      ctx.fillStyle=g;
      ctx.beginPath();
      ctx.arc(head.x,head.y,22,0,Math.PI*2);
      ctx.fill();
    }
  }
}

// Particles around hand
export class HandAura {
  constructor(canvas){
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d',{alpha:true});
    this.particles = [];
    this.dpr = Math.min(window.devicePixelRatio||1,2);
    this._resize();
    window.addEventListener('resize',()=>this._resize());
  }
  _resize(){
    const w=window.innerWidth,h=window.innerHeight;
    this.canvas.width=w*this.dpr;
    this.canvas.height=h*this.dpr;
    this.canvas.style.width=w+'px';
    this.canvas.style.height=h+'px';
    this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);
    this.W=w;this.H=h;
  }
  spawnAround(tips, palm){
    if(!tips || tips.length===0) return;
    // spawn 1-2 particles per tip
    for(const tip of tips){
      if(Math.random()<0.45){
        this.particles.push({
          x: tip.x + (Math.random()-0.5)*18,
          y: tip.y + (Math.random()-0.5)*18,
          vx: (Math.random()-0.5)*1.8,
          vy: (Math.random()-0.5)*1.8 -0.3,
          life:1,
          decay: 0.012 + Math.random()*0.018,
          r: Math.random()*2.2+0.8,
          hue: Math.random()>0.5? 158 : 252 // greenish or purple
        });
      }
    }
    // keep capped
    if(this.particles.length>140) this.particles.splice(0,this.particles.length-140);
  }
  render(enabled){
    const ctx=this.ctx;
    ctx.clearRect(0,0,this.W,this.H);
    if(!enabled) return;
    for(let i=this.particles.length-1;i>=0;i--){
      const p=this.particles[i];
      p.x+=p.vx;
      p.y+=p.vy;
      p.vx*=0.98; p.vy*=0.98;
      p.life-=p.decay;
      if(p.life<=0){this.particles.splice(i,1); continue;}
      const a=p.life;
      ctx.beginPath();
      const col = p.hue===158? `124,255,203` : `138,124,255`;
      ctx.fillStyle=`rgba(${col},${a})`;
      ctx.shadowColor=`rgba(${col},${a})`;
      ctx.shadowBlur=10*a;
      ctx.arc(p.x,p.y,p.r*a,0,Math.PI*2);
      ctx.fill();
    }
    ctx.shadowBlur=0;
  }
}

// Ambient canvas (neon vignette breathing)
export class AmbientRenderer {
  constructor(canvas){
    this.canvas=canvas;
    this.ctx=canvas.getContext('2d');
    this.dpr=Math.min(window.devicePixelRatio||1,2);
    this._resize();
    window.addEventListener('resize',()=>this._resize());
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
  render(handPos){
    const ctx=this.ctx;
    const W=this.W,H=this.H;
    ctx.clearRect(0,0,W,H);
    const t=performance.now()*0.0004;

    // breathing radial that follows hand slightly
    let cx=W*0.5, cy=H*0.5;
    if(handPos){
      cx += (handPos.x - cx)*0.08;
      cy += (handPos.y - cy)*0.08;
    }

    // soft large glow behind hand
    if(handPos){
      const grd = ctx.createRadialGradient(cx,cy,0,cx,cy, Math.max(W,H)*0.55);
      grd.addColorStop(0, `rgba(124,255,203,${0.09+Math.sin(t*3)*0.02})`);
      grd.addColorStop(0.35, `rgba(138,124,255,${0.06})`);
      grd.addColorStop(0.7, `rgba(0,0,0,0)`);
      ctx.fillStyle=grd;
      ctx.fillRect(0,0,W,H);
    }

    // edge neon breathing
    ctx.save();
    ctx.globalCompositeOperation='screen';
    // top edge
    let g = ctx.createLinearGradient(0,0,0,H*0.28);
    g.addColorStop(0,`rgba(124,255,203,${0.18+Math.sin(t*2)*0.05})`);
    g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=g;
    ctx.fillRect(0,0,W,H*0.3);

    g = ctx.createLinearGradient(0,H*0.7,0,H);
    g.addColorStop(0,'rgba(0,0,0,0)');
    g.addColorStop(1,`rgba(138,124,255,${0.14+Math.cos(t*2.2)*0.04})`);
    ctx.fillStyle=g;
    ctx.fillRect(0,H*0.68,W,H*0.32);

    ctx.restore();
  }
}

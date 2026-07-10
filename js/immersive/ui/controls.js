import { NEON_COLORS } from '../drawing/drawingManager.js';

export class ImmersiveUI {
  constructor(drawingManager){
    this.drawingManager = drawingManager;
    this.topBar = document.getElementById('topBar');
    this.bottomBar = document.getElementById('bottomBar');
    this.fpsEl = document.getElementById('fpsCounter');
    this.handStatus = document.getElementById('handStatus');
    this.drawStatus = document.getElementById('drawStatus');
    this.strokeCountEl = document.getElementById('strokeCount');
    this.currentColorLabel = document.getElementById('currentColorLabel');
    this.cursor = document.getElementById('cursor');
    this.colorPaletteEl = document.getElementById('colorPalette');
    this.undoBtn = document.getElementById('undoBtn');
    this.clearBtn = document.getElementById('clearBtn');

    // New buttons we will inject
    this.moveBtn = null;
    this.liftBtn = null;

    this.settings = { particles:true };
    this._buildPalette();
    this._injectExtraControls();
    this._bind();
  }

  _buildPalette(){
    if(!this.colorPaletteEl) return;
    this.colorPaletteEl.innerHTML='';
    NEON_COLORS.forEach((c,i)=>{
      const div=document.createElement('div');
      div.className='color-dot'+(i===0?' active':'');
      div.style.background = c.hex;
      div.style.color = c.hex;
      div.style.boxShadow = `0 0 10px ${c.hex}66`;
      div.title=c.label;
      div.dataset.id=c.id;
      div.addEventListener('click',()=>this.setColor(c));
      this.colorPaletteEl.appendChild(div);
    });
    this.setColor(NEON_COLORS[0]);
  }

  _injectExtraControls(){
    // Add Move + Lift buttons next to undo/clear
    const actions = document.querySelector('.cp-section.actions');
    if(!actions) return;

    const moveBtn = document.createElement('button');
    moveBtn.className='tool-btn icon-btn wide';
    moveBtn.id='moveBtn';
    moveBtn.title='Lift & move drawings (pinch to drag)';
    moveBtn.innerHTML='<span>✋</span> MOVE';
    actions.prepend(moveBtn);
    this.moveBtn = moveBtn;

    const liftBtn = document.createElement('button');
    liftBtn.className='tool-btn icon-btn wide';
    liftBtn.id='liftBtn';
    liftBtn.title='Force lift pen';
    liftBtn.innerHTML='<span>⬆</span> LIFT';
    actions.appendChild(liftBtn);
    this.liftBtn = liftBtn;
  }

  setColor(colorObj){
    this.drawingManager.setColor(colorObj);
    this.currentColorLabel.textContent = colorObj.label;
    this.currentColorLabel.style.color = colorObj.hex;
    this.currentColorLabel.style.textShadow = `0 0 12px ${colorObj.hex}`;
    this.colorPaletteEl.querySelectorAll('.color-dot').forEach(el=>{
      el.classList.toggle('active', el.dataset.id===colorObj.id);
    });
    const dot=this.cursor.querySelector('.cursor-dot');
    if(dot){
      dot.style.background = colorObj.hex;
      dot.style.boxShadow = `0 0 12px ${colorObj.hex}, 0 0 22px ${colorObj.hex}`;
    }
    const ring=this.cursor.querySelector('.cursor-ring');
    if(ring){
      ring.style.borderColor = colorObj.hex;
      ring.style.boxShadow = `0 0 18px ${colorObj.hex}, inset 0 0 10px ${colorObj.hex}66`;
    }
  }

  _bind(){
    this.undoBtn.addEventListener('click', ()=>{
      this.drawingManager.undo();
      this.updateStrokeCount();
    });
    this.clearBtn.addEventListener('click', ()=>{
      if(this.drawingManager.getCount()>0){
        if(confirm('Clear all neon drawings?')) this.drawingManager.clear();
        this.updateStrokeCount();
      }
    });

    this.moveBtn?.addEventListener('click', ()=>{
      const enabled = !this.drawingManager.moveMode;
      this.drawingManager.setMoveMode(enabled);
      this.moveBtn.classList.toggle('active', enabled);
      this.moveBtn.style.background = enabled ? 'rgba(124,255,203,0.22)' : '';
      this.moveBtn.style.borderColor = enabled ? 'rgba(124,255,203,0.5)' : '';
      this.moveBtn.innerHTML = enabled ? '<span>✋</span> MOVING' : '<span>✋</span> MOVE';
      if(enabled){
        this.setMoveFeedback('READY TO LIFT');
      }else{
        this.setMoveFeedback('');
      }
    });

    this.liftBtn?.addEventListener('click', ()=>{
      // Force lift / end current stroke
      if(this.drawingManager.currentStroke){
        this.drawingManager.endStroke();
        this.updateStrokeCount();
      }else{
        // if not drawing, ensure we are out of drawing state via event
        window.dispatchEvent(new CustomEvent('nexus:forceLift'));
      }
      this.setDrawing(false, 0, {type:'lift'});
    });

    document.getElementById('fullscreenBtn').addEventListener('click', ()=>{
      if(!document.fullscreenElement){
        document.documentElement.requestFullscreen().catch(()=>{});
      }else{
        document.exitFullscreen().catch(()=>{});
      }
    });
    document.getElementById('closeBtn').addEventListener('click',()=>{
      window.dispatchEvent(new CustomEvent('nexus:exitVoid'));
    });

    // listen for force lift from app
    window.addEventListener('nexus:forceLift', ()=>{
      // handled in app via? we will handle UI only
    });

    // auto show UI on move
    let lastMove = performance.now();
    const onMove = ()=>{
      lastMove = performance.now();
      this.show();
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchstart', onMove, {passive:true});
  }

  show(){
    this.topBar.classList.remove('hidden-ui');
    this.bottomBar.classList.remove('hidden-ui');
  }
  hide(){
    // keep bottom visible for drawing, don't auto hide now
  }

  setFPS(fps){ this.fpsEl.textContent = `${Math.round(fps)} FPS`; }

  setHandStatus(hasHand, count=0){
    if(hasHand){
      this.handStatus.textContent = count>1? `${count} HANDS` : `HAND LOCKED`;
      this.handStatus.style.color = '#7cffcb';
    }else{
      this.handStatus.textContent = 'NO HAND';
      this.handStatus.style.color = 'rgba(255,255,255,0.5)';
    }
  }

  setDrawing(isDrawing, pinchDist=0, gesture={}){
    const g = gesture || {};
    if(isDrawing){
      this.drawStatus.textContent = g.type==='point' ? 'POINT DRAW' : 'PINCH DRAW';
      this.drawStatus.classList.add('drawing');
      this.cursor.classList.add('drawing');
      this.cursor.querySelector('.cursor-label').textContent = 'DRAW';
    }else{
      let hint = 'READY';
      if(g.type==='open') hint = 'OPEN = LIFTED ✓';
      else if(g.type==='fist') hint = 'FIST = LIFTED ✓';
      else if(g.type==='point') hint = 'POINT TO DRAW';
      else if(g.isPinching) hint = 'PINCHING...';
      else if(pinchDist>0) hint = `LIFTED (pinch ${pinchDist.toFixed(2)})`;
      else hint = 'PINCH or POINT to draw';
      this.drawStatus.textContent = hint;
      this.drawStatus.classList.remove('drawing');
      this.cursor.classList.remove('drawing');
      this.cursor.querySelector('.cursor-label').textContent = hint.includes('DRAW') ? 'READY' : 'LIFTED';
    }
  }

  setMoveFeedback(text){
    if(text){
      this.drawStatus.textContent = text;
      this.drawStatus.classList.add('drawing');
    }else{
      this.drawStatus.textContent = 'READY';
      this.drawStatus.classList.remove('drawing');
    }
  }

  updateCursor(pos, visible){
    if(!pos || !visible){
      this.cursor.classList.add('hidden');
      return;
    }
    this.cursor.classList.remove('hidden');
    this.cursor.style.left = pos.x+'px';
    this.cursor.style.top = pos.y+'px';
  }

  updateStrokeCount(){
    this.strokeCountEl.textContent = this.drawingManager.getCount();
  }

  getSettings(){ return this.settings; }
}

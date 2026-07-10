import { HandTracker } from './tracking/handTracker.js';
import { VoidRenderer } from './rendering/renderer.js';
import { DustField, AmbientRenderer } from './rendering/particles.js';
import { DrawingManager } from './drawing/drawingManager.js';
import { ImmersiveUI } from './ui/controls.js';

export class ImmersiveApp {
  constructor(){
    this.videoEl = document.getElementById('videoEl');
    this.handCanvas = document.getElementById('handCanvas');
    this.maskCanvas = document.getElementById('maskCanvas');
    this.dustCanvas = document.getElementById('dustCanvas');
    this.ambientCanvas = document.getElementById('ambientCanvas');
    this.artGlowCanvas = document.getElementById('artGlowCanvas');
    this.artCoreCanvas = document.getElementById('artCoreCanvas');
    this.liveCanvas = document.getElementById('liveCanvas');
    this.effectsCanvas = document.getElementById('effectsCanvas');

    this.bootOverlay = document.getElementById('bootOverlay');
    this.bootStatus = document.getElementById('bootStatus');
    this.permOverlay = document.getElementById('permissionOverlay');

    this.tracker = new HandTracker();
    this.renderer = new VoidRenderer({
      videoEl:this.videoEl,
      handCanvas:this.handCanvas,
      maskCanvas:this.maskCanvas
    });

    this.drawingManager = new DrawingManager({
      glowCanvas:this.artGlowCanvas,
      coreCanvas:this.artCoreCanvas,
      liveCanvas:this.liveCanvas
    });

    this.dust = new DustField(this.dustCanvas);
    this.ambient = new AmbientRenderer(this.ambientCanvas);
    this.ui = new ImmersiveUI(this.drawingManager);

    this.lastFpsTime = performance.now();
    this.frameCount=0;
    this.fps=60;
    this.running=false;
    this.stream=null;

    // Drawing state with hysteresis for reliable lift
    this.isDrawing = false;
    this.smoothedPos = null;
    this.openFrames = 0;
    this.pinchFrames = 0;
    this.lastPosForMove = null;
    this.isMoving = false; // when in move mode and grabbing

    this._onExit = this._onExit.bind(this);
    window.addEventListener('nexus:exitVoid', this._onExit);
    window.addEventListener('nexus:forceLift', ()=>{
      if(this.isDrawing){
        this.isDrawing=false;
        this.pinchFrames=0;
        this.openFrames=10;
        this.drawingManager.endStroke();
        this.ui.updateStrokeCount();
        this.ui.setDrawing(false, 0, {type:'lift'});
      }
    });
  }

  async boot(){
    this._setBootStatus('Initializing draw space...');
    this.bootOverlay.classList.remove('hidden');
    try{
      await this.tracker.init((msg)=>this._setBootStatus(msg));
      this._setBootStatus('Ready — requesting camera');
      this.bootOverlay.classList.add('hidden');
    }catch(e){
      this._setBootStatus('Failed to load model: '+e.message);
      throw e;
    }
  }

  _setBootStatus(t){ if(this.bootStatus) this.bootStatus.textContent = t; }

  async enter(){
    this.permOverlay.classList.add('hidden');
    this.bootOverlay.classList.remove('hidden');
    this._setBootStatus('Starting camera...');
    try{
      this.stream = await this.tracker.startCamera(this.videoEl);
    }catch(err){
      console.warn(err);
      this.bootOverlay.classList.add('hidden');
      this.permOverlay.classList.remove('hidden');
      return;
    }
    this.bootOverlay.classList.add('hidden');
    this.running = true;
    this._startLoop();
  }

  _startLoop(){
    const loop = ()=>{
      if(!this.running) return;
      requestAnimationFrame(loop);
      this._renderFrame();
    };
    loop();

    this.tracker.processLoop((result)=>{
      if(!this.running) return;
      const hasHand = result.landmarks.length>0;
      this.ui.setHandStatus(hasHand, result.landmarks.length);
      this.renderer.setHands(result.landmarks);
      this.renderer.renderMask();
      this.renderer.renderHand();

      if(hasHand){
        const gesture = this.renderer.getGesture();
        const indexPos = this.renderer.getIndexTip();
        const pinchInfo = gesture.pinchInfo;

        // smooth cursor
        if(indexPos){
          if(!this.smoothedPos) this.smoothedPos = {...indexPos};
          else{
            this.smoothedPos.x += (indexPos.x - this.smoothedPos.x)*0.32;
            this.smoothedPos.y += (indexPos.y - this.smoothedPos.y)*0.32;
          }
          this.ui.updateCursor(this.smoothedPos, true);
        }

        // ----- MOVE MODE -----
        if(this.drawingManager.moveMode){
          // In move mode, pinching grabs and moves art
          if(gesture.isPinching && indexPos){
            if(!this.lastPosForMove){
              this.lastPosForMove = {...indexPos};
              // check if near drawing
              const near = this.drawingManager.isNearDrawing(indexPos.x, indexPos.y, 60);
              this.ui.setMoveFeedback(near ? 'GRABBING' : 'MOVING ALL');
            }else{
              const dx = indexPos.x - this.lastPosForMove.x;
              const dy = indexPos.y - this.lastPosForMove.y;
              if(Math.hypot(dx,dy) > 0.5){
                // move last stroke if near, else move all (for simplicity: move all when not near last?)
                // We'll move all for intuitive lift
                this.drawingManager.translateAll(dx, dy);
                this.lastPosForMove = {...indexPos};
                this.isMoving = true;
              }
            }
          }else{
            this.lastPosForMove = null;
            this.isMoving = false;
            this.ui.setMoveFeedback('READY TO LIFT');
          }
          // Don't draw while moving
          this.ui.setDrawing(false, gesture.pinchDist || 0, gesture);
          return;
        }

        // ----- DRAW MODE LOGIC -----
        // Determine intent to draw: pinch OR pointing gesture
        const wantsDraw = gesture.isPinching || gesture.isPointing;

        if(wantsDraw){
          this.pinchFrames++;
          this.openFrames = 0;
        }else{
          this.openFrames++;
          this.pinchFrames = Math.max(0, this.pinchFrames-1);
        }

        // Start drawing: need 2 consecutive wantsDraw frames (to avoid flicker)
        if(!this.isDrawing && this.pinchFrames >= 2 && wantsDraw){
          this.isDrawing = true;
          this.openFrames = 0;
          if(indexPos && pinchInfo){
            const z = pinchInfo.index.z || 0;
            this.drawingManager.startStroke({x:indexPos.x, y:indexPos.y, z});
          }
          this.ui.setDrawing(true, gesture.pinchDist, gesture);
        }

        // Continue drawing
        if(this.isDrawing && wantsDraw && indexPos && pinchInfo){
          const z = pinchInfo.index.z || 0;
          this.drawingManager.addPoint({x:indexPos.x, y:indexPos.y, z});
          this.ui.setDrawing(true, gesture.pinchDist, gesture);
        }

        // Lift / Stop drawing: open hand, fist, or not wanting draw for 4 frames
        // Makes lifting super easy: just open hand or make fist
        if(this.isDrawing && (this.openFrames >= 4 || gesture.isOpen || gesture.isFist)){
          this.isDrawing = false;
          this.pinchFrames = 0;
          this.drawingManager.endStroke();
          this.ui.updateStrokeCount();
          this.ui.setDrawing(false, gesture.pinchDist, gesture);
        }

        // If not drawing, update UI with gesture hint
        if(!this.isDrawing){
          this.ui.setDrawing(false, gesture.pinchDist, gesture);
        }

      }else{
        // no hand
        this.ui.updateCursor(null, false);
        if(this.isDrawing){
          this.isDrawing = false;
          this.drawingManager.endStroke();
          this.ui.updateStrokeCount();
        }
        this.pinchFrames = 0;
        this.openFrames++;
        this.lastPosForMove = null;
        this.ui.setDrawing(false, 0, {type:'none'});
      }
    });
  }

  _renderFrame(){
    this.frameCount++;
    const now = performance.now();
    const dt = now - this.lastFpsTime;
    if(dt>500){
      this.fps = (this.frameCount*1000/dt);
      this.ui.setFPS(this.fps);
      this.frameCount=0;
      this.lastFpsTime=now;
    }
    const palm = this.renderer.getPalmCenter();
    const indexTip = this.renderer.getIndexTip();
    const focusPos = indexTip || palm;
    this.dust.render(16, focusPos);
    this.ambient.render(focusPos);

    // drawing sparkles
    const ctx = this.effectsCanvas.getContext('2d');
    ctx.clearRect(0,0,this.effectsCanvas.width, this.effectsCanvas.height);
    if(focusPos && (this.isDrawing || this.isMoving)){
      ctx.save();
      const col = this.drawingManager.currentColor.hex;
      ctx.fillStyle = col;
      ctx.shadowColor = col;
      ctx.shadowBlur = 18;
      ctx.globalAlpha = 0.9;
      for(let i=0;i<3;i++){
        const ox = (Math.random()-0.5)*12;
        const oy = (Math.random()-0.5)*12;
        ctx.beginPath();
        ctx.arc(focusPos.x+ox, focusPos.y+oy, Math.random()*1.8+0.6,0,Math.PI*2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  async _onExit(){
    this.running=false;
    this.tracker.stopCamera();
    this.isDrawing=false;
    this.isMoving=false;
    this.drawingManager.cancelStroke();
    document.dispatchEvent(new CustomEvent('nexus:showHome'));
  }

  destroy(){
    this.running=false;
    window.removeEventListener('nexus:exitVoid', this._onExit);
    if(this.stream) this.stream.getTracks().forEach(t=>t.stop());
  }
}

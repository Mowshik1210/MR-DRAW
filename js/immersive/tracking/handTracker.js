import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { LandmarkSmoother } from '../../utils/smoothFilter.js';

const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

export class HandTracker {
  constructor(){
    this.landmarker = null;
    this.smoother = new LandmarkSmoother();
    this.running = false;
    this.onResults = null;
    this.video = null;
    this.lastVideoTime = -1;
  }

  async init(onProgress = () => {}){
    onProgress('Loading vision core...');
    const vision = await FilesetResolver.forVisionTasks(WASM_BASE);
    onProgress('Downloading hand model ~13MB...');
    this.landmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: MODEL_URL,
        delegate: 'GPU'
      },
      runningMode: 'VIDEO',
      numHands: 2,
      minHandDetectionConfidence: 0.6,
      minHandPresenceConfidence: 0.6,
      minTrackingConfidence: 0.6
    });
    onProgress('Model ready');
    return true;
  }

  async startCamera(videoEl){
    this.video = videoEl;
    const stream = await navigator.mediaDevices.getUserMedia({
      video:{
        facingMode:'user',
        width:{ideal:1280},
        height:{ideal:720},
        frameRate:{ideal:60, max:60}
      },
      audio:false
    });
    videoEl.srcObject = stream;
    await new Promise(res=>{
      videoEl.onloadedmetadata = ()=>{
        videoEl.play().then(res);
      };
    });
    return stream;
  }

  stopCamera(){
    if(this.video && this.video.srcObject){
      this.video.srcObject.getTracks().forEach(t=>t.stop());
      this.video.srcObject = null;
    }
    this.running = false;
  }

  processLoop(callback){
    this.onResults = callback;
    this.running = true;
    const tick = ()=>{
      if(!this.running) return;
      if(this.video && this.video.currentTime !== this.lastVideoTime && this.landmarker){
        this.lastVideoTime = this.video.currentTime;
        const start = performance.now();
        const result = this.landmarker.detectForVideo(this.video, start);
        if(result && result.landmarks && result.landmarks.length>0){
          const smoothedHands = result.landmarks.map(hand=> this.smoother.smooth(hand, start));
          callback({
            landmarks: smoothedHands,
            worldLandmarks: result.worldLandmarks,
            handedness: result.handedness,
            original: result.landmarks
          });
        }else{
          callback({ landmarks: [], worldLandmarks:[], handedness:[] });
        }
      }
      requestAnimationFrame(tick);
    };
    tick();
  }

  resetSmoother(){
    this.smoother.reset();
  }
}

<div align="center">

<!-- BANNER -->
<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=2,6,20&height=200&section=header&text=✨%20MR%20DRAW&fontSize=42&fontColor=fff&animation=fadeIn&fontAlignY=38&desc=Neon%20Void%20Air%20Drawing%20%E2%80%94%20Your%20Hand%20Is%20The%20Only%20Light&descAlignY=60&descAlign=50" width="100%"/>

<!-- BADGES -->
[![Three.js](https://img.shields.io/badge/Three.js-0.160-000000?style=for-the-badge&logo=three.js&logoColor=white)](https://threejs.org)
[![MediaPipe](https://img.shields.io/badge/MediaPipe-Tasks_Vision-00B2FF?style=for-the-badge&logo=google&logoColor=white)](https://developers.google.com/mediapipe)
[![WebGL](https://img.shields.io/badge/60_FPS-GPU_Accelerated-7CFFCB?style=for-the-badge&logo=webgl&logoColor=black)](#)
[![License](https://img.shields.io/badge/License-MIT-8A7CFF?style=for-the-badge)](LICENSE)

<br/>

> **🌌 Project · MR DRAW**
>
> **🎥 LIVE:** [Click here to Explore](https://mrdraw.dharshanmowshik.workers.dev)
>
> A premium, full-screen immersive web app where your hand appears in full natural color
> over a pure black void — pinch or point to paint persistent glowing neon strokes that
> stay in mid-air, forever. No controllers. Just you.

<br/>

[![⭐ Star this repo](https://img.shields.io/github/stars/your-user/nexus-draw?style=social)](https://github.com/your-user/nexus-draw)
&nbsp;&nbsp;
[![🍴 Fork](https://img.shields.io/github/forks/your-user/nexus-draw?style=social)](https://github.com/your-user/nexus-draw)

</div>

---

## 📸 App Preview

<div align="center">

| Void Hand | Neon Strokes | Move Mode |
|:---------:|:------------:|:---------:|
| *![](assets/hero-void.png)* | *![](assets/neon-strokes.png)* | *![](assets/move-mode.gif)* |



</div>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🖐️ **True Hand Isolation** | Adaptive dilated mask (14–34px), dual blur pass, `contrast(1.08) saturate(1.12)` — only your hand exists |
| 💫 **Persistent Neon** | Dual-canvas rendering: soft glow layer (32px shadow blur) + white-hot core layer, drawings never fade |
| 🎨 **9 Neon Colors** | Cyan, Blue, Green, Pink, Purple, Red, Orange, Yellow, White — swap on the fly |
| ✌️ **Reliable Gestures** | Pinch-ratio detection + index-pointing + open-hand/fist lift, tuned for ~60ms response |
| 🤏 **Lift & Move** | Dedicated MOVE mode — pinch-drag to grab and translate your entire artwork in space |
| 🎛️ **Studio Controls** | Undo, Clear, live stroke count, FPS meter, color label, fingertip bloom sparkles |
| ⚡ **60 FPS Cinematic** | Desynchronized 2D contexts, capped DPR, mirrored video, dust + ambient + vignette layers |
| 🏠 **Long Landing Page** | Scrollable marketing home — Features, How It Works, Tech, Creator, Contact |

---

## 🌌 The Void Canvas

**MR DRAW** flips the typical hand-tracking demo on its head. Instead of a skeleton overlay, it isolates **only the hand** — full natural skin tone, softly lit — and drops it into pure black `#000000`. Every stroke is stored as real vector data, not a fading particle trail.

```
✋ Hand isolated over #000000   ·   🎨 Persistent vector strokes   ·   🕹️ Lift + Move in 3D space
```

### 🎮 Gestures

| Gesture | Icon | Action |
|---------|:----:|--------|
| Pinch (thumb + index close) | 🤏 | Draw |
| Point (index only extended) | ☝️ | Draw *(easier)* |
| Open hand (all fingers extended) | ✋ | Lift / Stop |
| Fist (all folded) | ✊ | Lift / Stop |
| LIFT button | ⬆️ | Force lift |
| MOVE mode + pinch drag | 🫳 | Grab & translate all art |

### 🎨 Color Palette

| Color | Hex | Color | Hex |
|-------|-----|-------|-----|
| Cyan | `#7CFFCB` | Red | `#FF3B5C` |
| Blue | `#4EA3FF` | Orange | `#FF8A3D` |
| Green | `#3CFF6B` | Yellow | `#FFEB3B` |
| Pink | `#FF7CCF` | White | `#FFFFFF` |
| Purple | `#8A7CFF` | | |

---

## 🧠 How It Works — 5 Steps

```
① Camera Feed  →  ② GPU Hand Landmarks + Smoothing  →  ③ Mask & Isolate Hand
→  ④ Gesture Detection (Pinch / Point / Open / Fist)  →  ⑤ Draw, Lift, or Move
```

```js
// 1. Camera 1280x720@60fps, facingMode:user
const stream = await navigator.mediaDevices.getUserMedia({
  video:{facingMode:'user',width:{ideal:1280},frameRate:{ideal:60}}
})

// 2. HandLandmarker (GPU) + OneEuro filter smoothing
landmarker = await HandLandmarker.createFromOptions(vision, {
  numHands:2, minDetectionConfidence:0.6, delegate:'GPU'
})
smoothed = landmarkSmoother.smooth(landmarks, now) // OneEuro minCutoff 1.1, beta 0.02

// 3. Mask = thick connections + palm polygon + joint circles → blur → destination-in
solidCtx.lineWidth = clamp(palmPx*0.32, 14, 34)
maskCtx.filter = 'blur(14px)'; maskCtx.drawImage(solidCanvas)

// 4. Gesture: pinch OR pointing to draw
const ratio = screenDist / palmPx
const wantsDraw = (dist<0.07 && ratio<0.55) || isPointing
if (wantsDraw && pinchFrames>=2) startStroke({x,y,z})

// 5. Lift: open/fist or 4 frames no pinch → endStroke()
if (openFrames>=4 || isOpen || isFist) endStroke()
```

> **Depth reactive:** `depthFactor = 1 - (z+0.15)*2` — the closer your hand, the thicker and brighter the neon.

---

## 🛠️ Tech Stack

```
Vision       :  @mediapipe/tasks-vision@0.10.14  (HandLandmarker, GPU delegate)
Smoothing    :  OneEuroFilter per landmark  (freq 60, minCutoff 1.1, beta 0.02)
Rendering    :  Three.js 0.160.0  +  Canvas 2D  (dual-layer neon compositing)
Architecture :  Vanilla ES Modules — no framework bloat
Design       :  Glassmorphism, blur(28px) saturate(180%), Syne + Space Grotesk
```

| Layer | Responsibility |
|-------|-----------------|
| **VoidRenderer** | Cover-fit math, mirrored video, tight adaptive mask |
| **DrawingManager** | Quadratic stroke smoothing, persistent glow + core layers, move/lift |
| **DustField / AmbientRenderer** | Palm-attracted particles, breathing neon ambience |
| **Controls** | Palette, undo/clear/move/lift UI |

---

## 🗂️ Project Structure

```
MR-DRAW/
│
├── 📄 index.html
│
├── 📁 js/
│   ├── home/scene3d.js                    ← Three.js landing page scene
│   ├── immersive/tracking/handTracker.js  ← MediaPipe hand landmarks
│   ├── immersive/rendering/renderer.js    ← isolation + gesture helpers
│   ├── immersive/rendering/particles.js   ← dust / ambient particles
│   ├── immersive/drawing/drawingManager.js← persistent neon, move/lift
│   ├── immersive/ui/controls.js           ← palette + undo/clear/move/lift
│   └── utils/smoothFilter.js + helpers.js
│
├── 📁 css/
│   ├── home.css        ← long scroll landing page
│   ├── immersive.css    ← void canvas studio
│   └── style.css
│
├── 📁 assets/           ← screenshots & preview media
└── 📄 README.md         ← You are here
```

---

## 🚀 Getting Started

### Prerequisites

```bash
A modern browser (Chrome/Edge)   Python 3 or Node.js   A webcam
```

### 1 · Clone the repository

```bash
git clone https://github.com/your-user/MR-DRAW.git
cd MR-DRAW
```

### 2 · Serve it locally

Camera access needs a secure context (`https` or `localhost`):

```bash
python3 -m http.server 8000
# or
npx serve .
```

### 3 · Open & draw

```
http://localhost:8000
# allow camera → pinch or point to draw → open hand to lift
```

**Best experience:** Chrome/Edge, good front light on your hand, plain wall behind you, 20–40cm from camera.

---

## 📦 Dependencies

```txt
@mediapipe/tasks-vision  >= 0.10.14
three                    == 0.160.0
```

No build step, no bundler required — everything loads as native ES modules.

---

## 🎯 How to Use

```
1.  Open the app and allow camera access
2.  Pinch (thumb + index) or point (☝️) to start drawing in the air
3.  Move your hand — the neon stroke follows and stays in place
4.  Open your hand or make a fist to lift the pen
5.  Pick a color from the 9-color palette, undo mistakes, or clear the canvas
6.  Switch to MOVE mode and pinch-drag to grab and reposition your entire artwork
```

---

## 📊 Interaction Reliability

```
                precision    recall   response

      Pinch        high        high     ~60ms
   Pointing         high      medium     ~60ms
  Open/Fist Lift    high        high    4 frames
   Move & Drag      high        high    real-time
```

> Tuned via pinch-ratio thresholds (start `<0.42`, end `>0.52`) and 2-frame hysteresis to avoid sticky-pen jitter.

---

## 🧩 Code Architecture

The app is organized into focused, single-responsibility modules:

```js
initVoidRenderer()     // Cover-fit canvas setup, mirrored video, mask pipeline
handTracker.js         // GPU HandLandmarker + OneEuro smoothing
detectGesture()        // Pinch / point / open / fist classification
startStroke()          // Begins a new persistent stroke at {x, y, z}
_renderStroke()         // Quadratic-smoothed glow + core layer rendering
endStroke()             // Commits stroke to persistent canvas, resets state
translateAll(dx, dy)    // MOVE mode — shifts every stored point
isNearDrawing()         // Grab detection for MOVE mode
undo() / clear()        // Stroke history management
```

---

## 🌐 Deploy

```
1.  Push this repo to GitHub
2.  Deploy static files via GitHub Pages, Vercel, or Netlify
3.  Ensure HTTPS is enabled (required for camera access)
4.  Share the link — live in minutes! 🚀
```

---

## 🛠️ Customisation Guide

**Change gesture sensitivity:**
```js
// In handTracker.js
const PINCH_START = 0.42   // lower = stricter pinch
const PINCH_END    = 0.52  // higher = more forgiving release
```

**Add a new neon color:**
```js
// In js/immersive/ui/controls.js
COLORS.push({ name: 'Teal', hex: '#00FFD1' })
```

**Adjust bloom intensity:**
```js
// In drawingManager.js
artGlow.shadowBlur = 32   // increase for a dreamier bloom
```

---

## 📚 Learning Outcomes

By studying this project you will understand:

- ✅ Real-time hand landmark tracking with MediaPipe Tasks Vision
- ✅ GPU-accelerated gesture recognition (pinch, point, open, fist)
- ✅ Signal smoothing with the OneEuro filter
- ✅ Canvas masking and compositing for hand isolation
- ✅ Dual-layer neon rendering (glow + core) for persistent vector art
- ✅ Building 60 FPS immersive experiences with vanilla ES modules
- ✅ Three.js particle systems and depth-reactive rendering
- ✅ Glassmorphism UI design for futuristic, cinematic interfaces

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

```bash
# Fork the repo
git checkout -b feature/your-feature-name
git commit -m "feat: add your feature"
git push origin feature/your-feature-name
# Open a Pull Request
```

### 🗺️ Roadmap

- [x] Full hand isolation over `#000000`
- [x] Persistent neon + bloom
- [x] Pinch + point + open/fist lift
- [x] Move mode (translate art in air)
- [x] 9 colors, undo, clear
- [x] Long landing page with features/tech/creator/contact
- [ ] Save/Export PNG + SVG
- [ ] Multi-hand collaborative drawing
- [ ] Hand mesh with lighting (MediaPipe Face + Hands)
- [ ] WebXR passthrough mode

---

## 📄 License

Distributed under the **MIT License**. Use it, remix it, build your own void — keep the neon alive.

---

## 👤 Author

<div align="center">

**MR DRAW**
*Immersive web obsessive, building void canvases where the only light is you.*

*"The hand should remain in full natural color. Everything else blends into black.
The interface should feel futuristic, elegant, cinematic." — Original brief, kept intact.*

🌐 `mrdraw.dharshanmowshik.workers.dev` &nbsp;·&nbsp; ✉️ `dharshanmowshik@gmail.com` &nbsp;·&nbsp; 💼 Open to immersive installs, art, product labs

[![Website](https://img.shields.io/badge/Website-nexus--void.app-181717?style=for-the-badge&logo=vercel&logoColor=white)](https://mrdraw.dharshanmowshik.workers.dev)

</div>

---

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=2,6,20&height=100&section=footer" width="100%"/>

*Built with 💜 in Coimbatore, IN · Est. 2026 · Pinch the air and share your first neon doodle*

**PINCH = DRAW • OPEN = LIFT • MOVE = GRAB ART • 60 FPS • PURE BLACK VOID**

</div>

<div align="center">

# ✨ MR DRAW
### Neon Void Air Drawing

**Draw in mid-air. Your hand is the only light.**

A premium, full-screen immersive web app where your hand appears in full natural color over a pure black void. Pinch or point to paint persistent glowing neon strokes that stay forever — lift, move, change colors, all in the air. No controllers. Just you.

<br/>

![Three.js](https://img.shields.io/badge/Three.js-0.160-black?style=for-the-badge&logo=three.js)
![MediaPipe](https://img.shields.io/badge/MediaPipe-Tasks_Vision-00B2FF?style=for-the-badge)
![FPS](https://img.shields.io/badge/60_FPS-GPU_Accelerated-7CFFCB?style=for-the-badge)
![Neon](https://img.shields.io/badge/Neon-Bloom_Magic-8A7CFF?style=for-the-badge&logo=webgl)
![License](https://img.shields.io/badge/License-MIT-white?style=for-the-badge)

<br/>

**Stack:** Vanilla ES Modules · WebGL · Canvas 2D — *no framework bloat*
**Made in:** Coimbatore, IN · Est. 2026

<br/>

```bash
python -m http.server 8000
```

</div>

---

## 🎥 Demo Preview

```
PINCH thumb+index   →  DRAW
POINT ☝️ index only  →  DRAW
OPEN HAND ✋ / FIST ✊  →  LIFT (instant, 4 frames)
MOVE MODE + PINCH DRAG →  LIFT & MOVE ENTIRE ART

9 COLORS · UNDO · CLEAR · DEPTH-REACTIVE BLOOM
```

> 💡 **Quick start tip:** Good light on your hand, plain background, pinch close to the camera. Open your hand quickly to lift. The neon stays exactly where you drew it.

---

## 🌌 Why This Hits Different

Most hand-tracking demos show a skeleton outline. We flipped it.

- 🖐️ **Only your hand is visible** — full natural skin tone, softly lit, isolated over pure black. Everything else disappears.
- 🎨 **Drawings are permanent vector art** — not fading particles. Each stroke stored as `{points[], color, size}` with `z` depth.
- ✋ **Lifting actually works** — hysteresis + pointing detection + open/fist detection = lift in ~60ms, no sticky pen.
- 🧲 **Grab your art and move it in space** — MOVE mode translates every point with `translateAll(dx, dy)`.

This isn't a filter. It's a **void canvas studio**.

---

## ⚡ Features

| Feature | Details |
|---|---|
| 🫥 **True Hand Isolation** | Adaptive dilated mask (14–34px), blur 14px/7px, cover-fit for any resolution, `contrast(1.08) saturate(1.12)` |
| 💫 **Persistent Neon** | Dual canvas: `artGlow` (18px, 32px shadowBlur, `mix-blend-mode: screen`) + `artCore` (white-hot 3.8px + color 2.6px) |
| 🎨 **9 Neon Colors** | Cyan `#7CFFCB` · Blue `#4EA3FF` · Green `#3CFF6B` · Pink `#FF7CCF` · Purple `#8A7CFF` · Red `#FF3B5C` · Orange `#FF8A3D` · Yellow `#FFEB3B` · White |
| 🤏 **Reliable Gestures** | Pinch ratio `screenDist/palmPx` (start <0.42, end >0.52) + pointing (index extended, others folded) + open/fist |
| 🧲 **Lift & Move** | MOVE mode: pinch-drag → `translateAll(dx,dy)` + `isNearDrawing()` for grab detection. LIFT button forces `endStroke()` |
| 🎛️ **Studio Controls** | Undo (pop + redraw), Clear (confirm), stroke count, FPS, color label, bloom sparkles at fingertip |
| 🚀 **60 FPS Cinematic** | Desynchronized 2D contexts, DPR capped 1.8, `translate(W)+scale(-1,1)` mirrored video, dust + ambient + vignette |
| 🌐 **Long Landing Page** | Scrollable home with Features, How It Works, Tech, Creator, Contact — dashboard kept intact on top |

---

## 🧠 How It Works

```js
// 1. Camera 1280x720@60fps, facingMode: user
const stream = await navigator.mediaDevices.getUserMedia({
  video: { facingMode: 'user', width: { ideal: 1280 }, frameRate: { ideal: 60 } }
})

// 2. HandLandmarker (GPU) + OneEuro filter smoothing
landmarker = await HandLandmarker.createFromOptions(vision, {
  numHands: 2, minDetectionConfidence: 0.6, delegate: 'GPU'
})
smoothed = landmarkSmoother.smooth(landmarks, now) // OneEuro minCutoff 1.1, beta 0.02

// 3. Mask = thick connections + palm polygon + joint circles → blur → destination-in
solidCtx.lineWidth = clamp(palmPx * 0.32, 14, 34)
maskCtx.filter = 'blur(14px)'; maskCtx.drawImage(solidCanvas)

// 4. Gesture: pinch OR pointing to draw
const ratio = screenDist / palmPx
const wantsDraw = (dist < 0.07 && ratio < 0.55) || isPointing
if (wantsDraw && pinchFrames >= 2) startStroke({ x, y, z })

// 5. Lift: open/fist or 4 frames no pinch → endStroke() → persistent canvases
if (openFrames >= 4 || isOpen || isFist) endStroke()
```

**Depth reactive:** `depthFactor = 1 - (z + 0.15) * 2` → the closer your hand, the thicker and brighter the neon.

---

## 🛠️ Tech Stack

**Vision**
- `@mediapipe/tasks-vision@0.10.14` — HandLandmarker, `FilesetResolver.forVisionTasks(WASM)`
- `LandmarkSmoother` — OneEuroFilter per landmark (freq 60, minCutoff 1.1, beta 0.02)

**Rendering**
- **Three.js 0.160.0** — Home scene: 1600 additive particles, torus knots, `FogExp2(0x000000, 0.035)`
- **VoidRenderer** — cover-fit math, mirrored video, tight hand mask
- **DrawingManager** — `_renderStroke()` with quadratic smoothing, glow + core layers
- **Particles** — DustField (attracted to palm), AmbientRenderer (breathing neon)

**Architecture**

```
/js/home/scene3d.js
/js/immersive/tracking/handTracker.js
/js/immersive/rendering/renderer.js      → isolation + gesture helpers
/js/immersive/rendering/particles.js     → dust/ambient
/js/immersive/drawing/drawingManager.js  → persistent neon, move/lift
/js/immersive/ui/controls.js             → palette + undo/clear/move/lift
/js/utils/smoothFilter.js + helpers.js
/css/home.css (long scroll) + immersive.css + style.css
```

**Design**
- Glassmorphism `backdrop-filter: blur(28px) saturate(180%)`
- Typography: Syne + Space Grotesk
- Neon vars: `--neon: #7CFFCB`, `--neon-2: #8A7CFF`

---

## 🎮 Gesture Cheatsheet

| Gesture | Action |
|---|---|
| 🤏 **Pinch** thumb + index close | Draw |
| ☝️ **Point** index only extended | Draw (easier) |
| ✋ **Open** all fingers extended | Lift / Stop |
| ✊ **Fist** all folded | Lift / Stop |
| ⬆️ **LIFT button** | Force lift |
| 🧲 **MOVE + pinch drag** | Grab & translate all art |

Cursor: white dot + colored ring, `DRAW` label when drawing, `LIFTED ✓` when lifted. Sparkles bloom at your fingertip while drawing.

---

## 🚀 Run Locally — 10 Seconds

```bash
# clone
git clone https://github.com/Mowshik1210/MR-DRAW.git
cd MR-DRAW

# serve (camera needs a secure context or localhost)
python3 -m http.server 8000
# or
npx serve .

# open
http://localhost:8000
# allow camera → pinch to draw → open hand to lift
```

**Best experience:** Chrome or Edge, good front light on your hand, plain wall behind you, 20–40cm from the camera.

---

## 📸 Screens

> Add your own screenshots to `/assets`:

```
hero-void.png       → hand in black
neon-strokes.png    → persistent colors
move-mode.gif        → dragging art
landing-long.png    → scroll page
```

---

## 🗺️ Roadmap

- [x] Full hand isolation over `#000`
- [x] Persistent neon + bloom
- [x] Pinch + point + open/fist lift
- [x] Move mode (translate art in air)
- [x] 9 colors, undo, clear
- [x] Long landing with features/tech/creator/contact
- [ ] Save/Export PNG + SVG
- [ ] Multi-hand collaborative drawing
- [ ] Hand mesh with lighting (MediaPipe Face + Hands)
- [ ] WebXR passthrough mode

---

## 👤 Creator

<div align="center">

**MR DRAW — Coimbatore, IN**

*"The hand should remain in full natural color. Everything else blends into black. The interface should feel futuristic, elegant, cinematic."*
— Original brief, kept intact.

Immersive web obsessive, building void canvases where the only light is you.

🌐 [mrdraw.dharshanmowshik.workers.dev](https://mrdraw.dharshanmowshik.workers.dev) · ✉️ dharshanmowshik@gmail.com
💼 Open to immersive installs, art, product labs

</div>

---

## 📄 License

MIT — Use it, remix it, build your own void. Keep the neon alive.

---

<div align="center">

**If this made you pinch the air — ⭐ star the repo and share your first neon doodle.**

*PINCH = DRAW · OPEN = LIFT · MOVE = GRAB ART · 60 FPS · PURE BLACK VOID*

</div>

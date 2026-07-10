export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const map = (v, inMin, inMax, outMin, outMax) => outMin + (outMax - outMin) * ((v - inMin) / (inMax - inMin));
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export function createCanvas(width, height){
  const c = document.createElement('canvas');
  c.width = width; c.height = height;
  return c;
}

export function resizeCanvasToDisplaySize(canvas, multiplier = 1){
  const needW = Math.floor(canvas.clientWidth * multiplier * (window.devicePixelRatio || 1));
  const needH = Math.floor(canvas.clientHeight * multiplier * (window.devicePixelRatio || 1));
  const needResize = canvas.width !== needW || canvas.height !== needH;
  if(needResize){
    canvas.width = needW;
    canvas.height = needH;
  }
  return needResize;
}

export function debounce(fn, ms){
  let t; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), ms); };
}

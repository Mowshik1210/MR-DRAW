import { HomeScene } from './home/scene3d.js';
import { ImmersiveApp } from './immersive/app.js';

const homePage = document.getElementById('homePage');
const immersivePage = document.getElementById('immersivePage');
const homeCanvas = document.getElementById('homeCanvas');
const startBtn = document.getElementById('startBtn');
const allowCamBtn = document.getElementById('allowCamBtn');

let homeScene = null;
let immersiveApp = null;
let booted = false;

function initHome(){
  homeScene = new HomeScene(homeCanvas);
  homeScene.startLoop();
}

function showPage(which){
  if(which==='home'){
    immersivePage.classList.remove('active');
    homePage.classList.add('active');
    if(homeScene) homeScene.startLoop();
  }else{
    homePage.classList.remove('active');
    immersivePage.classList.add('active');
    if(homeScene) homeScene.stopLoop();
  }
}

async function enterVoid(){
  showPage('immersive');
  if(!immersiveApp){
    immersiveApp = new ImmersiveApp();
  }
  if(!booted){
    try{
      await immersiveApp.boot();
      booted = true;
    }catch(e){
      console.error(e);
      showPage('home');
      return;
    }
  }
  await immersiveApp.enter();
}

startBtn.addEventListener('click', enterVoid);
if(allowCamBtn){
  allowCamBtn.addEventListener('click', enterVoid);
}

document.addEventListener('nexus:showHome', ()=>{
  showPage('home');
});

document.addEventListener('keydown', (e)=>{
  if(e.key==='Escape' && immersivePage.classList.contains('active')){
    window.dispatchEvent(new CustomEvent('nexus:exitVoid'));
  }
});

// Handle visibility
document.addEventListener('visibilitychange', ()=>{
  if(document.hidden){
    if(homeScene) homeScene.stopLoop();
  }else{
    if(homePage.classList.contains('active') && homeScene) homeScene.startLoop();
  }
});

// Prevent scroll bounce on mobile only for immersive page
document.body.addEventListener('touchmove', (e)=>{
  if(immersivePage.classList.contains('active')) e.preventDefault();
}, {passive:false});

// --- New: Smooth scroll for home nav links inside scrollable #homePage ---
document.querySelectorAll('.home-nav .nav-links a[href^=\"#\"], .home-footer-long .footer-links a[href^=\"#\"]').forEach(a=>{
  a.addEventListener('click', (e)=>{
    const id = a.getAttribute('href');
    if(id==='#') return;
    const target = document.querySelector(id);
    if(target && homePage.contains(target)){
      e.preventDefault();
      const top = target.offsetTop - 72; // nav height
      homePage.scrollTo({top, behavior:'smooth'});
    }
  });
});

// Contact form: simple mailto
const sendBtn = document.getElementById('sendBtn');
if(sendBtn){
  sendBtn.addEventListener('click', ()=>{
    const name = document.getElementById('cName')?.value || '';
    const email = document.getElementById('cEmail')?.value || '';
    const msg = document.getElementById('cMsg')?.value || '';
    const subject = encodeURIComponent(`NEXUS Void inquiry from ${name}`);
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\nMessage:\n${msg}\n\n---\nSent from NEXUS DRAW landing`);
    window.location.href = `mailto:hello@nexus-void.app?subject=${subject}&body=${body}`;
  });
}

initHome();

console.log('%c NEXUS DRAW v2.0 — LONG LANDING ', 'background:#7cffcb;color:#000;font-weight:800;padding:6px 12px;border-radius:8px;');
console.log('%c Features • Tech • Creator • Contact added, dashboard kept intact ', 'color:#7cffcb;');

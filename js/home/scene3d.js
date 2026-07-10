import * as THREE from 'three';

export class HomeScene {
  constructor(canvas){
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x000000, 0.035);
    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth/window.innerHeight, 0.1, 100);
    this.camera.position.set(0,0.5,6);
    this.renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:true});
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.clock = new THREE.Clock();
    this.mouse = {x:0,y:0, tx:0, ty:0};
    this._init();
    this._bind();
  }

  _init(){
    // Ambient light
    const ambient = new THREE.PointLight(0x7cffcb, 2.2, 20);
    ambient.position.set(2,3,2);
    this.scene.add(ambient);
    const p2 = new THREE.PointLight(0x8a7cff, 1.8, 18);
    p2.position.set(-2,-1,1);
    this.scene.add(p2);

    // Particle field - 3 layers for depth
    this.groups = [];
    
    const createLayer = (count, scale, speed, color) => {
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(count*3);
      const sizes = new Float32Array(count);
      const speeds = new Float32Array(count);
      for(let i=0;i<count;i++){
        pos[i*3+0] = (Math.random()-0.5)*scale*2.2;
        pos[i*3+1] = (Math.random()-0.5)*scale;
        pos[i*3+2] = (Math.random()-0.5)*scale*1.2 -1;
        sizes[i] = Math.random()*1.2+0.2;
        speeds[i] = Math.random()*0.4+0.1;
      }
      geo.setAttribute('position', new THREE.BufferAttribute(pos,3));
      geo.setAttribute('size', new THREE.BufferAttribute(sizes,1));
      const mat = new THREE.PointsMaterial({
        size: 0.06,
        color: color,
        transparent:true, opacity:0.9,
        sizeAttenuation:true,
        blending: THREE.AdditiveBlending,
        depthWrite:false
      });
      // Use shader to vary opacity/size
      mat.onBeforeCompile = shader=>{
        shader.vertexShader = shader.vertexShader.replace(
          'void main() {',
          `attribute float size; varying float vAlpha; void main(){ vAlpha = 0.6 + sin(position.x*0.5+position.y)*0.4;`
        );
        shader.fragmentShader = shader.fragmentShader.replace(
          'diffuseColor.a = opacity;',
          `diffuseColor.a = opacity * vAlpha;
           float d = length(gl_PointCoord-0.5);
           float glow = 1.0 - smoothstep(0.0,0.5,d);
           diffuseColor.a *= glow;`
        );
      };
      const points = new THREE.Points(geo, mat);
      points.userData = {speed, baseY:0, sizes: pos};
      this.scene.add(points);
      this.groups.push({geo, mat, points, pos, speeds, speedMul:speed});
    };

    createLayer(800, 12, 0.15, 0x7cffcb);
    createLayer(500, 14, 0.08, 0x8a7cff);
    createLayer(350, 10, 0.22, 0xffffff);

    // Subtle wireframe torus - cinematic
    const torusGeo = new THREE.TorusGeometry(2.6, 0.02, 16, 120);
    const torusMat = new THREE.MeshBasicMaterial({
      color:0x7cffcb, 
      transparent:true, 
      opacity:0.18,
      wireframe:false
    });
    this.torus = new THREE.Mesh(torusGeo, torusMat);
    this.torus.rotation.x = Math.PI*0.35;
    this.torus.position.z = -2;
    this.scene.add(this.torus);

    const torus2 = new THREE.Mesh(
      new THREE.TorusGeometry(3.4, 0.01, 12, 100),
      new THREE.MeshBasicMaterial({color:0x8a7cff, transparent:true, opacity:0.12})
    );
    torus2.rotation.x = -Math.PI*0.25;
    torus2.rotation.y = 0.2;
    torus2.position.z = -2.5;
    this.scene.add(torus2);
    this.torus2 = torus2;

    // Gradient plane for depth
    const gradGeo = new THREE.PlaneGeometry(20,20);
    const gradMat = new THREE.ShaderMaterial({
      transparent:true,
      uniforms:{time:{value:0}},
      vertexShader:`varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader:`
        varying vec2 vUv;
        uniform float time;
        void main(){
          vec2 uv=vUv;
          float d = length(uv-0.5)*1.2;
          float glow = 1.0 - smoothstep(0.0,1.0,d);
          vec3 c1 = vec3(0.48,1.0,0.80);
          vec3 c2 = vec3(0.54,0.49,1.0);
          vec3 col = mix(c2,c1, sin(uv.x*3.0 + time*0.2)*0.5+0.5);
          float a = glow * 0.08;
          gl_FragColor = vec4(col, a);
        }
      `,
      depthWrite:false,
      blending: THREE.AdditiveBlending
    });
    const gradMesh = new THREE.Mesh(gradGeo, gradMat);
    gradMesh.position.z = -4;
    this.scene.add(gradMesh);
    this.gradMat = gradMat;

    this.raf = null;
  }

  _bind(){
    this._onResize = this._onResize.bind(this);
    this._onMouse = this._onMouse.bind(this);
    window.addEventListener('resize', this._onResize);
    window.addEventListener('mousemove', this._onMouse);
    window.addEventListener('touchmove', (e)=>{
      if(e.touches[0]) this._onMouse({clientX:e.touches[0].clientX, clientY:e.touches[0].clientY});
    }, {passive:true});
  }

  _onResize(){
    this.camera.aspect = window.innerWidth/window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
  _onMouse(e){
    const x = (e.clientX / window.innerWidth - 0.5)*2;
    const y = (e.clientY / window.innerHeight - 0.5)*2;
    this.mouse.tx = x;
    this.mouse.ty = -y;
  }

  render(dt){
    // smooth mouse
    this.mouse.x += (this.mouse.tx - this.mouse.x)*0.05;
    this.mouse.y += (this.mouse.ty - this.mouse.y)*0.05;

    const t = this.clock.getElapsedTime();
    this.camera.position.x = this.mouse.x*0.8;
    this.camera.position.y = this.mouse.y*0.5 + 0.2;
    this.camera.lookAt(0,0,-2);

    if(this.torus){
      this.torus.rotation.y = t*0.12;
      this.torus.rotation.z = Math.sin(t*0.1)*0.15;
    }
    if(this.torus2){
      this.torus2.rotation.y = -t*0.08;
    }
    if(this.gradMat){
      this.gradMat.uniforms.time.value = t;
    }

    // animate particles - float slowly
    this.groups.forEach((g,i)=>{
      const pos = g.pos;
      const count = pos.length/3;
      for(let j=0;j<count;j++){
        pos[j*3+1] += Math.sin(t*0.2 + j*0.01)*0.002 * g.speedMul;
        pos[j*3+0] += Math.cos(t*0.15 + j*0.008)*0.0015 * g.speedMul;
        // slow depth drift
        pos[j*3+2] += g.speeds[j]*0.002;
        if(pos[j*3+2] > 3) pos[j*3+2] = -6 - Math.random()*2;
      }
      g.geo.attributes.position.needsUpdate = true;
      // subtle opacity pulse
      g.mat.opacity = 0.5 + Math.sin(t*0.5 + i)*0.2;
    });

    this.renderer.render(this.scene, this.camera);
  }

  startLoop(){
    if(this.raf) return;
    const loop = ()=>{
      this.render();
      this.raf = requestAnimationFrame(loop);
    };
    loop();
  }
  stopLoop(){
    if(this.raf){ cancelAnimationFrame(this.raf); this.raf=null; }
  }
  destroy(){
    this.stopLoop();
    window.removeEventListener('resize', this._onResize);
    this.renderer.dispose();
  }
}

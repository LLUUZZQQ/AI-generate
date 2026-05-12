"use client";
import { useEffect, useRef } from "react";

export function InteractiveLogo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const targetRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let animId: number;
    let scene: any, camera: any, renderer: any, mesh: any;

    const init = async () => {
      const THREE = await import("three");

      const w = container.clientWidth;
      const h = container.clientHeight;

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(35, w / h, 0.1, 100);
      camera.position.set(0, 0.05, 9);
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      container.appendChild(renderer.domElement);

      // Lighting
      scene.add(new THREE.AmbientLight(0x6666aa, 0.5));
      const k = new THREE.DirectionalLight(0xffffff, 3.5);
      k.position.set(3, 2, 5); scene.add(k);
      const rim = new THREE.DirectionalLight(0xbbccff, 3);
      rim.position.set(-3, 2, -3); scene.add(rim);
      const bot = new THREE.DirectionalLight(0xddaaff, 2);
      bot.position.set(0, -3, 2); scene.add(bot);

      // Rounded box helper
      function rbox(w: number, h: number, d: number, rad: number) {
        const x = -w/2, y = -h/2;
        const s = new THREE.Shape();
        s.moveTo(x+rad, y); s.lineTo(x+w-rad, y);
        s.quadraticCurveTo(x+w, y, x+w, y+rad);
        s.lineTo(x+w, y+h-rad);
        s.quadraticCurveTo(x+w, y+h, x+w-rad, y+h);
        s.lineTo(x+rad, y+h);
        s.quadraticCurveTo(x, y+h, x, y+h-rad);
        s.lineTo(x, y+rad);
        s.quadraticCurveTo(x, y, x+rad, y);
        return new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 4 });
      }

      const mat = new THREE.MeshPhysicalMaterial({
        color: 0xe0d4ff, metalness: 0.0, roughness: 0.22,
        clearcoat: 1.0, clearcoatRoughness: 0.12,
        transparent: true, opacity: 0.38, envMapIntensity: 0.5,
      });

      const stroke = 0.82;
      const depth = 0.6;

      // Three pieces that overlap at joints, then merge
      const stem = new THREE.Mesh(rbox(stroke, 4.2, depth, stroke*0.55), mat);
      stem.position.set(-1, 0, -depth/2);

      const topBar = new THREE.Mesh(rbox(2.5, stroke, depth, stroke*0.55), mat);
      topBar.position.set(0.15, 1.85, -depth/2);

      const midBar = new THREE.Mesh(rbox(1.9, stroke*0.9, depth, stroke*0.55), mat);
      midBar.position.set(-0.1, 0, -depth/2);

      // Merge into single mesh
      let mergeGeometries: any = null;
      try {
        const mod = await import("three/examples/jsm/utils/BufferGeometryUtils.js");
        mergeGeometries = mod.mergeGeometries;
      } catch { /* fallback to group */ }

      let finalGeo: any;
      if (mergeGeometries) {
        const geos = [stem.geometry.clone(), topBar.geometry.clone(), midBar.geometry.clone()];
        geos[0].applyMatrix4(stem.matrixWorld);
        geos[1].applyMatrix4(topBar.matrixWorld);
        geos[2].applyMatrix4(midBar.matrixWorld);
        finalGeo = mergeGeometries(geos, false);
      } else {
        // Fallback: just add them to a group
        const g = new THREE.Group();
        g.add(stem); g.add(topBar); g.add(midBar);
        mesh = g;
        scene.add(mesh);
      }

      if (finalGeo) {
        const mergedMesh = new THREE.Mesh(finalGeo, mat);
        const group = new THREE.Group();
        group.add(mergedMesh);

        // Edge glow on merged geo
        const edgeGeo = new THREE.EdgesGeometry(finalGeo);
        const edgeLine = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({ color: 0xccbbff, transparent: true, opacity: 0.3 }));
        group.add(edgeLine);
        mesh = group;
        scene.add(mesh);
      }

      // Particles
      const pGeo = new THREE.BufferGeometry();
      const count = 40;
      const pos = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        pos[i*3] = (Math.random()-0.5)*14;
        pos[i*3+1] = (Math.random()-0.5)*14;
        pos[i*3+2] = (Math.random()-0.5)*10;
      }
      pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const pMat = new THREE.PointsMaterial({ color: 0xd4c4f0, size: 0.02, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false });
      scene.add(new THREE.Points(pGeo, pMat));

      const animate = () => {
        animId = requestAnimationFrame(animate);
        targetRef.current.x += (mouseRef.current.x - targetRef.current.x) * 0.04;
        targetRef.current.y += (mouseRef.current.y - targetRef.current.y) * 0.04;
        if (mesh) {
          mesh.rotation.y = targetRef.current.x * 0.85;
          mesh.rotation.x = targetRef.current.y * 0.4;
          mesh.position.y = Math.sin(Date.now()*0.0008)*0.1;
        }
        renderer.render(scene, camera);
      };
      animate();
    };

    init();

    const onMouse = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    const onResize = () => {
      if (!renderer || !camera) return;
      const w = container.clientWidth, h = container.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("mousemove", onMouse);
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("resize", onResize);
      if (renderer) renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full aspect-square max-w-[420px] mx-auto cursor-grab active:cursor-grabbing select-none"
    />
  );
}

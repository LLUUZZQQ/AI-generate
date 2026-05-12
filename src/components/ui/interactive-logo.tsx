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

      scene.add(new THREE.AmbientLight(0x6666aa, 0.5));
      const k = new THREE.DirectionalLight(0xffffff, 3.5);
      k.position.set(3, 2, 5); scene.add(k);
      const rim = new THREE.DirectionalLight(0xbbccff, 3);
      rim.position.set(-3, 2, -3); scene.add(rim);
      const bot = new THREE.DirectionalLight(0xddaaff, 2);
      bot.position.set(0, -3, 2); scene.add(bot);

      // === Single continuous F shape ===
      const stroke = 0.78;
      const halfH = 2.1;
      const topW = 2.5;
      const midW = 1.9;
      const r = stroke * 0.5; // corner radius

      const sx = -1.35; // left edge x
      const shape = new THREE.Shape();

      // Start: bottom-left
      shape.moveTo(sx, -halfH);

      // Up left side, turning into top bar top-left corner
      shape.lineTo(sx, halfH - stroke);
      shape.quadraticCurveTo(sx, halfH, sx + r, halfH);

      // Top bar: across the top
      shape.lineTo(sx + topW - r, halfH);
      shape.quadraticCurveTo(sx + topW, halfH, sx + topW, halfH - r);

      // Top bar: down right side
      shape.lineTo(sx + topW, halfH - stroke + r);
      shape.quadraticCurveTo(sx + topW, halfH - stroke, sx + topW - r, halfH - stroke);

      // Top bar: back left along bottom
      shape.lineTo(sx + stroke + r, halfH - stroke);
      shape.quadraticCurveTo(sx + stroke, halfH - stroke, sx + stroke, halfH - stroke - r);

      // Inner stem: down to mid bar
      shape.lineTo(sx + stroke, stroke + r);
      shape.quadraticCurveTo(sx + stroke, stroke, sx + stroke + r, stroke);

      // Mid bar: across to the right
      shape.lineTo(sx + midW - r, stroke);
      shape.quadraticCurveTo(sx + midW, stroke, sx + midW, stroke - r);

      // Mid bar: down right side
      shape.lineTo(sx + midW, -stroke + r);
      shape.quadraticCurveTo(sx + midW, -stroke, sx + midW - r, -stroke);

      // Mid bar: back left along bottom
      shape.lineTo(sx + stroke + r, -stroke);
      shape.quadraticCurveTo(sx + stroke, -stroke, sx + stroke, -stroke - r);

      // Inner stem: down to bottom
      shape.lineTo(sx + stroke, -halfH + r);
      shape.quadraticCurveTo(sx + stroke, -halfH, sx, -halfH);

      const geo = new THREE.ExtrudeGeometry(shape, {
        depth: 0.6,
        bevelEnabled: true,
        bevelThickness: 0.08,
        bevelSize: 0.07,
        bevelSegments: 4,
      });

      const mat = new THREE.MeshPhysicalMaterial({
        color: 0xe0d4ff, metalness: 0.0, roughness: 0.22,
        clearcoat: 1.0, clearcoatRoughness: 0.12,
        transparent: true, opacity: 0.38, envMapIntensity: 0.5,
      });

      const group = new THREE.Group();
      const fMesh = new THREE.Mesh(geo, mat);
      fMesh.position.z = -0.3;
      group.add(fMesh);

      // Edge glow
      const edgeGeo = new THREE.EdgesGeometry(geo);
      const edgeLine = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({ color: 0xccbbff, transparent: true, opacity: 0.35 }));
      edgeLine.position.z = -0.3;
      group.add(edgeLine);

      mesh = group;
      scene.add(mesh);

      // Particles
      const pGeo = new THREE.BufferGeometry();
      const count = 40;
      const pos = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 14;
        pos[i * 3 + 1] = (Math.random() - 0.5) * 14;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 10;
      }
      pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      scene.add(new THREE.Points(pGeo, new THREE.PointsMaterial({
        color: 0xd4c4f0, size: 0.02, transparent: true, opacity: 0.3,
        blending: THREE.AdditiveBlending, depthWrite: false,
      })));

      const animate = () => {
        animId = requestAnimationFrame(animate);
        targetRef.current.x += (mouseRef.current.x - targetRef.current.x) * 0.04;
        targetRef.current.y += (mouseRef.current.y - targetRef.current.y) * 0.04;
        if (mesh) {
          mesh.rotation.y = targetRef.current.x * 0.85;
          mesh.rotation.x = targetRef.current.y * 0.4;
          mesh.position.y = Math.sin(Date.now() * 0.0008) * 0.1;
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

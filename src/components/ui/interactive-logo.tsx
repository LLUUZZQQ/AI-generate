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
      camera.position.set(0, 0.1, 8.5);
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;
      container.appendChild(renderer.domElement);

      // Lighting
      scene.add(new THREE.AmbientLight(0x6666aa, 0.6));
      const key = new THREE.DirectionalLight(0xffffff, 4);
      key.position.set(3, 2, 5);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0xbbccff, 3);
      rim.position.set(-4, 2, -3);
      scene.add(rim);
      const bot = new THREE.DirectionalLight(0xddaaff, 2);
      bot.position.set(0, -3, 2);
      scene.add(bot);

      // Build continuous F shape as a path, then TubeGeometry
      const group = new THREE.Group();

      const strokeW = 0.55; // tube radius
      const hTotal = 4.2;   // total height
      const topW = 2.4;     // top bar width
      const midW = 1.8;     // mid bar width
      const halfH = hTotal / 2;

      // Helper: add a tube segment between two 3D points
      function tubeSegment(x1: number, y1: number, x2: number, y2: number, z: number) {
        const curve = new THREE.LineCurve3(
          new THREE.Vector3(x1, y1, z),
          new THREE.Vector3(x2, y2, z)
        );
        return new THREE.TubeGeometry(curve, 16, strokeW, 16, false);
      }

      // Helper: add a 90-degree rounded corner as a tube
      function tubeCorner(cx: number, cy: number, z: number, fromAngle: number, toAngle: number) {
        const r = strokeW * 0.4;
        const curve = new THREE.EllipseCurve(cx, cy, r, r, fromAngle, toAngle, false, 0);
        const pts = curve.getPoints(8);
        const path = new THREE.CatmullRomCurve3(
          pts.map(p => new THREE.Vector3(p.x, p.y, z))
        );
        return new THREE.TubeGeometry(path, 12, strokeW, 8, false);
      }

      const z = 0;
      const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0xe0d0ff,
        metalness: 0.0,
        roughness: 0.2,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
        transparent: true,
        opacity: 0.4,
        envMapIntensity: 0.5,
      });

      // Build F using connected tube segments
      const parts: any[] = [];

      // Vertical stem: bottom to top
      parts.push(new THREE.Mesh(tubeSegment(-1, -halfH, -1, halfH, z), glassMat));

      // Top bar: from stem rightward
      parts.push(new THREE.Mesh(tubeSegment(-1, halfH, -1 + topW, halfH, z), glassMat));

      // Mid bar: from stem rightward
      parts.push(new THREE.Mesh(tubeSegment(-1, 0, -1 + midW, 0, z), glassMat));

      // Rounded corners connecting bars to stem
      const cr = strokeW * 0.6;
      function corner(cx: number, cy: number, startA: number, endA: number) {
        const curve = new THREE.EllipseCurve(cx, cy, cr, cr, startA, endA, false, 0);
        const pts = curve.getPoints(8);
        const path = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p.x, p.y, z)));
        return new THREE.Mesh(new THREE.TubeGeometry(path, 10, strokeW, 8, false), glassMat);
      }

      // Top-left inner corner
      parts.push(corner(-1, halfH - strokeW, -Math.PI / 2, 0));
      // Top-right terminal (rounded cap)
      parts.push(corner(-1 + topW, halfH, -Math.PI, 0));
      // Mid-left inner corner
      parts.push(corner(-1, strokeW, -Math.PI / 2, 0));
      // Mid-right terminal
      parts.push(corner(-1 + midW, 0, -Math.PI, 0));
      // Stem bottom
      parts.push(corner(-1, -halfH + strokeW, Math.PI / 2, Math.PI));

      for (const p of parts) {
        group.add(p);
      }

      mesh = group;
      scene.add(mesh);

      // Subtle particles
      const pGeo = new THREE.BufferGeometry();
      const count = 40;
      const pos = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 14;
        pos[i * 3 + 1] = (Math.random() - 0.5) * 14;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 10;
      }
      pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const pMat = new THREE.PointsMaterial({
        color: 0xd4c4f0,
        size: 0.02,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const particles = new THREE.Points(pGeo, pMat);
      scene.add(particles);

      const animate = () => {
        animId = requestAnimationFrame(animate);
        targetRef.current.x += (mouseRef.current.x - targetRef.current.x) * 0.04;
        targetRef.current.y += (mouseRef.current.y - targetRef.current.y) * 0.04;
        if (mesh) {
          mesh.rotation.y = targetRef.current.x * 0.9;
          mesh.rotation.x = targetRef.current.y * 0.45;
          mesh.position.y = Math.sin(Date.now() * 0.0008) * 0.12;
        }
        particles.rotation.y += 0.0005;
        particles.rotation.x += 0.00025;
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

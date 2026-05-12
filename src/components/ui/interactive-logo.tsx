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
      camera.position.set(0, 0, 9);
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      container.appendChild(renderer.domElement);

      // Lighting — bright soft lights for glass
      scene.add(new THREE.AmbientLight(0x7777aa, 0.7));
      const key = new THREE.DirectionalLight(0xffffff, 3.5);
      key.position.set(4, 2, 6);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0xaaccff, 3);
      rim.position.set(-4, 3, -4);
      scene.add(rim);
      const fill = new THREE.DirectionalLight(0xcc88ff, 2);
      fill.position.set(0, -3, 3);
      scene.add(fill);

      // Helper: rounded box using ExtrudeGeometry
      function roundedBox(w: number, h: number, d: number, radius: number) {
        const x = -w / 2, y = -h / 2;
        const shape = new THREE.Shape();
        shape.moveTo(x + radius, y);
        shape.lineTo(x + w - radius, y);
        shape.quadraticCurveTo(x + w, y, x + w, y + radius);
        shape.lineTo(x + w, y + h - radius);
        shape.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
        shape.lineTo(x + radius, y + h);
        shape.quadraticCurveTo(x, y + h, x, y + h - radius);
        shape.lineTo(x, y + radius);
        shape.quadraticCurveTo(x, y, x + radius, y);
        return new THREE.ExtrudeGeometry(shape, {
          depth: d,
          bevelEnabled: true,
          bevelThickness: 0.06,
          bevelSize: 0.05,
          bevelSegments: 4,
        });
      }

      const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0xddccff,
        metalness: 0.0,
        roughness: 0.22,
        clearcoat: 1.0,
        clearcoatRoughness: 0.12,
        transparent: true,
        opacity: 0.35,
        envMapIntensity: 0.5,
        specularIntensity: 1.0,
      });

      const edgeMat = new THREE.LineBasicMaterial({
        color: 0xccbbff,
        transparent: true,
        opacity: 0.4,
      });

      const group = new THREE.Group();

      // Vertical stem — tall, thick
      const sw = 0.95, sd = 0.7, sh = 4.0, sr = 0.18;
      const stemGeo = roundedBox(sw, sh, sd, sr);
      const stemMesh = new THREE.Mesh(stemGeo, glassMat);
      stemMesh.position.set(-0.95, 0, -sd / 2);
      group.add(stemMesh);
      const stemEdge = new THREE.LineSegments(new THREE.EdgesGeometry(stemGeo), edgeMat);
      stemEdge.position.copy(stemMesh.position);
      group.add(stemEdge);

      // Top bar — wide, thick
      const tw = 2.6, td = 0.7, th = 0.95, tr = 0.18;
      const topGeo = roundedBox(tw, th, td, tr);
      const topMesh = new THREE.Mesh(topGeo, glassMat);
      topMesh.position.set(0.15, 1.75, -td / 2);
      group.add(topMesh);
      const topEdge = new THREE.LineSegments(new THREE.EdgesGeometry(topGeo), edgeMat);
      topEdge.position.copy(topMesh.position);
      group.add(topEdge);

      // Mid bar — medium
      const mw = 2.0, md = 0.7, mh = 0.85, mr = 0.18;
      const midGeo = roundedBox(mw, mh, md, mr);
      const midMesh = new THREE.Mesh(midGeo, glassMat);
      midMesh.position.set(-0.1, 0, -md / 2);
      group.add(midMesh);
      const midEdge = new THREE.LineSegments(new THREE.EdgesGeometry(midGeo), edgeMat);
      midEdge.position.copy(midMesh.position);
      group.add(midEdge);

      mesh = group;
      scene.add(mesh);

      // Subtle floating particles
      const pGeo = new THREE.BufferGeometry();
      const count = 50;
      const pos = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 14;
        pos[i * 3 + 1] = (Math.random() - 0.5) * 14;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 10;
      }
      pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const pMat = new THREE.PointsMaterial({
        color: 0xccbbff,
        size: 0.022,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const particles = new THREE.Points(pGeo, pMat);
      scene.add(particles);

      // Animation loop
      const animate = () => {
        animId = requestAnimationFrame(animate);
        targetRef.current.x += (mouseRef.current.x - targetRef.current.x) * 0.04;
        targetRef.current.y += (mouseRef.current.y - targetRef.current.y) * 0.04;
        if (mesh) {
          mesh.rotation.y = targetRef.current.x * 1.0;
          mesh.rotation.x = targetRef.current.y * 0.5;
          mesh.position.y = Math.sin(Date.now() * 0.0008) * 0.15;
        }
        particles.rotation.y += 0.0006;
        particles.rotation.x += 0.0003;
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
      const w = container.clientWidth;
      const h = container.clientHeight;
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

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

      // Scene
      scene = new THREE.Scene();

      // Camera
      camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 100);
      camera.position.set(0, 0, 8);

      // Renderer
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      container.appendChild(renderer.domElement);

      // Lights
      scene.add(new THREE.AmbientLight(0x3a2050, 1.2));
      const key = new THREE.DirectionalLight(0xb57bee, 2.5);
      key.position.set(5, 3, 5);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0xec4899, 1.2);
      fill.position.set(-3, -1, -2);
      scene.add(fill);
      const rim = new THREE.DirectionalLight(0xf59e0b, 0.8);
      rim.position.set(0, 5, -3);
      scene.add(rim);

      // Create "F" letter using BoxGeometry pieces
      const mat = new THREE.MeshPhysicalMaterial({
        color: 0xb57bee,
        metalness: 0.05,
        roughness: 0.2,
        clearcoat: 0.4,
        clearcoatRoughness: 0.2,
        emissive: 0x1a1030,
        emissiveIntensity: 0.3,
      });

      const group = new THREE.Group();

      // F vertical stroke
      const stem = new THREE.Mesh(new THREE.BoxGeometry(0.65, 4.5, 0.8), mat);
      stem.position.set(-1.1, 0, 0);
      group.add(stem);

      // F top horizontal
      const top = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.65, 0.8), mat);
      top.position.set(0.15, 1.925, 0);
      group.add(top);

      // F middle horizontal
      const mid = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.55, 0.8), mat);
      mid.position.set(-0.2, 0, 0);
      group.add(mid);

      mesh = group;
      scene.add(mesh);

      // Floating particles
      const particlesGeo = new THREE.BufferGeometry();
      const count = 80;
      const positions = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 12;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 12;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 6;
      }
      particlesGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const particlesMat = new THREE.PointsMaterial({
        color: 0xb57bee,
        size: 0.03,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const particles = new THREE.Points(particlesGeo, particlesMat);
      scene.add(particles);

      // Animation loop
      const animate = () => {
        animId = requestAnimationFrame(animate);

        // Smooth mouse follow
        targetRef.current.x += (mouseRef.current.x - targetRef.current.x) * 0.05;
        targetRef.current.y += (mouseRef.current.y - targetRef.current.y) * 0.05;

        if (mesh) {
          mesh.rotation.y = targetRef.current.x * 1.2;
          mesh.rotation.x = targetRef.current.y * 0.6;
          // Gentle floating
          mesh.position.y = Math.sin(Date.now() * 0.001) * 0.2;
        }

        particles.rotation.y += 0.0008;
        particles.rotation.x += 0.0004;

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
      className="w-full h-[320px] md:h-[420px] cursor-grab active:cursor-grabbing select-none"
    />
  );
}

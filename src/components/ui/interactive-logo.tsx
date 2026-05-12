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

      // Lights — bright, crisp for glass
      scene.add(new THREE.AmbientLight(0x8888cc, 0.8));
      const key = new THREE.DirectionalLight(0xffffff, 3);
      key.position.set(3, 2, 6);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0xaaccff, 2.5);
      rim.position.set(-3, 4, -3);
      scene.add(rim);
      const bottom = new THREE.DirectionalLight(0xcc88ff, 1.5);
      bottom.position.set(0, -3, 2);
      scene.add(bottom);

      // Frosted glass "F"
      const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0xddccff,
        metalness: 0.0,
        roughness: 0.25,
        clearcoat: 1.0,
        clearcoatRoughness: 0.15,
        transparent: true,
        opacity: 0.35,
        envMapIntensity: 0.4,
        specularIntensity: 1.0,
      });

      const group = new THREE.Group();

      // F — vertical stroke
      const stem = new THREE.Mesh(new THREE.BoxGeometry(0.5, 4.0, 0.6), glassMat);
      stem.position.set(-0.9, 0, 0);
      group.add(stem);

      // F — top bar
      const top = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 0.6), glassMat);
      top.position.set(0.1, 1.75, 0);
      group.add(top);

      // F — mid bar
      const mid = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, 0.6), glassMat);
      mid.position.set(-0.2, 0, 0);
      group.add(mid);

      // Glowing edges on the F
      const createEdges = (geo: any, pos: [number, number, number]) => {
        const edgesGeo = new THREE.EdgesGeometry(geo);
        const edgesMat = new THREE.LineBasicMaterial({ color: 0xccbbff, transparent: true, opacity: 0.5 });
        const line = new THREE.LineSegments(edgesGeo, edgesMat);
        line.position.set(...pos);
        return line;
      };
      group.add(createEdges(new THREE.BoxGeometry(0.5, 4.0, 0.6), [-0.9, 0, 0]));
      group.add(createEdges(new THREE.BoxGeometry(2.2, 0.5, 0.6), [0.1, 1.75, 0]));
      group.add(createEdges(new THREE.BoxGeometry(1.6, 0.45, 0.6), [-0.2, 0, 0]));

      mesh = group;
      scene.add(mesh);

      // Floating glass-like particles
      const particlesGeo = new THREE.BufferGeometry();
      const count = 60;
      const positions = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 14;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 14;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 8;
      }
      particlesGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const particlesMat = new THREE.PointsMaterial({
        color: 0xccbbff,
        size: 0.025,
        transparent: true,
        opacity: 0.4,
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

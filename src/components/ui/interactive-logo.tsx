"use client";
import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, useTexture } from "@react-three/drei";
import * as THREE from "three";

function OtterRelief() {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  const [albedo, alphaMask, normalMap] = useTexture([
    "/otters/albedo.png",
    "/otters/alpha-mask.png",
    "/otters/normal.png",
  ]);

  // Texture encoding
  normalMap.colorSpace = THREE.LinearSRGBColorSpace ?? THREE.SRGBColorSpace;
  albedo.colorSpace = THREE.SRGBColorSpace;

  // Block fills same area as the old F-logo
  const size = 4.4;
  const r = 0.45;
  const half = size / 2;

  const shape = useMemo(() => {
    const s = new THREE.Shape();
    const l = -half + r, ri = half - r, b = -half + r, t = half - r;
    s.moveTo(l, -half); s.lineTo(ri, -half);
    s.quadraticCurveTo(half, -half, half, b); s.lineTo(half, t);
    s.quadraticCurveTo(half, half, ri, half); s.lineTo(l, half);
    s.quadraticCurveTo(-half, half, -half, t); s.lineTo(-half, b);
    s.quadraticCurveTo(-half, -half, l, -half);
    return s;
  }, []);

  const geo = useMemo(() => new THREE.ExtrudeGeometry(shape, {
    depth: 0.6,
    bevelEnabled: true,
    bevelThickness: 0.14,
    bevelSize: 0.12,
    bevelSegments: 5,
  }), [shape]);

  const glowGeo = useMemo(() => {
    const pad = 0.35;
    const s = new THREE.Shape();
    const g = half + pad;
    const gr = r + pad;
    const l = -g + gr, ri = g - gr, b = -g + gr, t2 = g - gr;
    s.moveTo(l, -g); s.lineTo(ri, -g);
    s.quadraticCurveTo(g, -g, g, b); s.lineTo(g, t2);
    s.quadraticCurveTo(g, g, ri, g); s.lineTo(l, g);
    s.quadraticCurveTo(-g, g, -g, t2); s.lineTo(-g, b);
    s.quadraticCurveTo(-g, -g, l, -g);
    return new THREE.ShapeGeometry(s);
  }, []);

  useFrame((state) => {
    if (meshRef.current) {
      const mx = (state.mouse.x || 0) * 0.4;
      const my = (state.mouse.y || 0) * 0.25;
      meshRef.current.rotation.y += 0.002;
      meshRef.current.rotation.x += (my - meshRef.current.rotation.x) * 0.015;
      meshRef.current.rotation.y += (mx * 0.4 - meshRef.current.rotation.y) * 0.01;
    }
    if (glowRef.current) {
      glowRef.current.rotation.copy(meshRef.current?.rotation || new THREE.Euler());
    }
  });

  return (
    <Float speed={1.3} rotationIntensity={0.06} floatIntensity={0.2}>
      <group>
        {/* Back glow */}
        <mesh ref={glowRef as any} geometry={glowGeo} position={[0, 0, -0.65]}>
          <meshBasicMaterial color="#8b5cf6" transparent opacity={0.06} side={THREE.DoubleSide} />
        </mesh>

        {/* Inner ambient glow behind relief */}
        <mesh position={[0, 0, -0.4]} scale={[0.9, 0.9, 1]}>
          <planeGeometry args={[size, size]} />
          <meshBasicMaterial color="#b57bee" transparent opacity={0.04} side={THREE.DoubleSide} />
        </mesh>

        {/* 3D EXTRUDED RELIEF BLOCK */}
        <mesh ref={meshRef} geometry={geo} position={[0, 0, -0.2]}>
          <meshStandardMaterial
            map={albedo}
            alphaMap={alphaMask}
            normalMap={normalMap}
            normalScale={new THREE.Vector2(1.2, 1.2)}
            metalness={0.03}
            roughness={0.28}
            transparent
            alphaTest={0.05}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Edge wireframe accent */}
        <lineSegments geometry={new THREE.EdgesGeometry(geo)} position={[0, 0, -0.2]}>
          <lineBasicMaterial color="#b57bee" transparent opacity={0.15} />
        </lineSegments>
      </group>
    </Float>
  );
}

export function InteractiveLogo() {
  return (
    <div className="w-full aspect-square max-w-[440px] mx-auto cursor-grab active:cursor-grabbing select-none">
      <Canvas
        camera={{ position: [0, 0.2, 9], fov: 34 }}
        gl={{
          alpha: true,
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.15,
        }}
        dpr={[1, 2]}
      >
        <color attach="background" args={["#0a0a14"]} />

        <ambientLight intensity={0.25} color="#222244" />
        <directionalLight position={[6, 5, 9]} intensity={10} color="#ffffff" />
        <directionalLight position={[-5, 3, -4]} intensity={4} color="#d0c8ff" />
        <directionalLight position={[0, -4, -5]} intensity={2.5} color="#ffd0e0" />
        <pointLight position={[0, 5, 6]} intensity={3} color="#aaccff" />

        <OtterRelief />
      </Canvas>
    </div>
  );
}

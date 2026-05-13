"use client";
import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, useTexture } from "@react-three/drei";
import * as THREE from "three";

function OtterRelief() {
  const meshRef = useRef<THREE.Mesh>(null);

  const [albedo, alphaMask, normalMap] = useTexture([
    "/otters/albedo.png",
    "/otters/alpha-mask.png",
    "/otters/normal.png",
  ]);

  normalMap.colorSpace = THREE.LinearSRGBColorSpace ?? THREE.SRGBColorSpace;
  albedo.colorSpace = THREE.SRGBColorSpace;

  useFrame((state) => {
    if (!meshRef.current) return;
    const mx = (state.mouse.x || 0) * 0.35;
    const my = (state.mouse.y || 0) * 0.2;
    meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, mx * 0.5, 0.01);
    meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, my * 0.3, 0.01);
  });

  return (
    <Float speed={1.3} rotationIntensity={0.04} floatIntensity={0.15}>
      <mesh ref={meshRef}>
        <planeGeometry args={[4.4, 4.4]} />
        <meshStandardMaterial
          map={albedo}
          alphaMap={alphaMask}
          normalMap={normalMap}
          normalScale={new THREE.Vector2(1.2, 1.2)}
          metalness={0.02}
          roughness={0.3}
          transparent
          alphaTest={0.05}
          side={THREE.DoubleSide}
        />
      </mesh>
    </Float>
  );
}

export function InteractiveLogo() {
  return (
    <div className="w-full aspect-square max-w-[440px] mx-auto cursor-grab active:cursor-grabbing select-none">
      <Canvas
        camera={{ position: [0, 0, 7], fov: 38 }}
        gl={{
          alpha: true,
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
        }}
        dpr={[1, 2]}
      >
        <color attach="background" args={["#0a0a14"]} />

        <ambientLight intensity={0.4} color="#2a2a44" />
        <directionalLight position={[5, 4, 8]} intensity={8} color="#ffffff" />
        <directionalLight position={[-4, 2, -4]} intensity={3} color="#d0c8ff" />
        <pointLight position={[0, 4, 5]} intensity={2.5} color="#aaccff" />

        <OtterRelief />
      </Canvas>
    </div>
  );
}

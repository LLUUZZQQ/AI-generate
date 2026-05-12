"use client";
import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float } from "@react-three/drei";
import * as THREE from "three";

function FShape() {
  const meshRef = useRef<THREE.Mesh>(null);
  const stroke = 0.78;
  const halfH = 2.1;
  const topW = 2.5;
  const midW = 1.9;
  const r = stroke * 0.5;
  const sx = -1.35;

  const shape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(sx, -halfH);
    s.lineTo(sx, halfH - stroke);
    s.quadraticCurveTo(sx, halfH, sx + r, halfH);
    s.lineTo(sx + topW - r, halfH);
    s.quadraticCurveTo(sx + topW, halfH, sx + topW, halfH - r);
    s.lineTo(sx + topW, halfH - stroke + r);
    s.quadraticCurveTo(sx + topW, halfH - stroke, sx + topW - r, halfH - stroke);
    s.lineTo(sx + stroke + r, halfH - stroke);
    s.quadraticCurveTo(sx + stroke, halfH - stroke, sx + stroke, halfH - stroke - r);
    s.lineTo(sx + stroke, stroke + r);
    s.quadraticCurveTo(sx + stroke, stroke, sx + stroke + r, stroke);
    s.lineTo(sx + midW - r, stroke);
    s.quadraticCurveTo(sx + midW, stroke, sx + midW, stroke - r);
    s.lineTo(sx + midW, -stroke + r);
    s.quadraticCurveTo(sx + midW, -stroke, sx + midW - r, -stroke);
    s.lineTo(sx + stroke + r, -stroke);
    s.quadraticCurveTo(sx + stroke, -stroke, sx + stroke, -stroke - r);
    s.lineTo(sx + stroke, -halfH + r);
    s.quadraticCurveTo(sx + stroke, -halfH, sx, -halfH);
    return s;
  }, []);

  const geo = useMemo(() => {
    return new THREE.ExtrudeGeometry(shape, {
      depth: 0.6,
      bevelEnabled: true,
      bevelThickness: 0.08,
      bevelSize: 0.07,
      bevelSegments: 4,
    });
  }, [shape]);

  useFrame((state) => {
    if (meshRef.current) {
      const mx = (state.mouse.x || 0) * 0.5;
      const my = (state.mouse.y || 0) * 0.3;
      meshRef.current.rotation.y += 0.003;
      meshRef.current.rotation.x += (my - meshRef.current.rotation.x) * 0.02;
      meshRef.current.rotation.y += (mx * 0.5 - meshRef.current.rotation.y) * 0.01;
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.15} floatIntensity={0.3}>
      <mesh ref={meshRef} geometry={geo} position={[0, 0, -0.3]}>
        <meshPhysicalMaterial
          color="#e8e0ff"
          metalness={0.0}
          roughness={0.15}
          clearcoat={1.0}
          clearcoatRoughness={0.06}
          transparent
          opacity={0.6}
          envMapIntensity={0.8}
          specularIntensity={1.5}
        />
      </mesh>
      <lineSegments geometry={new THREE.EdgesGeometry(geo)} position={[0, 0, -0.3]}>
        <lineBasicMaterial color="#ccbbff" transparent opacity={0.5} />
      </lineSegments>
    </Float>
  );
}

export function InteractiveLogo() {
  return (
    <div className="w-full aspect-square max-w-[420px] mx-auto cursor-grab active:cursor-grabbing select-none">
      <Canvas
        camera={{ position: [0, 0.1, 9], fov: 35 }}
        gl={{ alpha: true, antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
        dpr={[1, 2]}
      >
        <ambientLight intensity={0.5} color="#6666aa" />
        <directionalLight position={[3, 2, 5]} intensity={3.5} color="#ffffff" />
        <directionalLight position={[-3, 2, -3]} intensity={3} color="#bbccff" />
        <directionalLight position={[0, -3, 2]} intensity={2} color="#ddaaff" />
        <FShape />
        <Environment preset="city" />
      </Canvas>
    </div>
  );
}

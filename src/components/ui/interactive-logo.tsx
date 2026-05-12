"use client";
import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float } from "@react-three/drei";
import * as THREE from "three";

// Floating particles around the logo
function Particles({ count = 40 }: { count?: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const positions = useMemo(() => {
    const pts: Float32Array[] = [];
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const r = 2.8 + Math.random() * 2.2;
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      const speed = 0.2 + Math.random() * 0.6;
      const offset = Math.random() * Math.PI * 2;
      pts.push(new Float32Array([x, y, z, speed, offset]));
    }
    return pts;
  }, [count]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.children.forEach((child, i) => {
      const [x, y, z, speed, offset] = positions[i];
      const a = t * speed * 0.3 + offset;
      const s = 0.2 + Math.sin(a) * 0.1;
      child.position.set(
        x + Math.sin(a) * 0.3,
        y + Math.cos(a * 1.3) * 0.3,
        z + Math.cos(a) * 0.2,
      );
      child.scale.setScalar(Math.max(0.1, s));
    });
  });

  return (
    <group ref={groupRef}>
      {positions.map((_, i) => (
        <mesh key={i}>
          <sphereGeometry args={[0.02, 8, 8]} />
          <meshBasicMaterial color="#ccbbff" transparent opacity={0.5} />
        </mesh>
      ))}
    </group>
  );
}

function FShape() {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  const stroke = 0.78;
  const halfH = 2.1;
  const topW = 2.5;
  const midW = 1.9;
  const sx = -1.35;
  const r = stroke * 0.5;

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

  // Larger glow mesh behind the logo
  const glowGeo = useMemo(() => {
    const s = new THREE.Shape();
    const pad = 0.4;
    s.moveTo(sx - pad, -halfH - pad);
    s.lineTo(sx - pad, halfH - stroke + pad);
    s.quadraticCurveTo(sx - pad, halfH + pad, sx + r - pad, halfH + pad);
    s.lineTo(sx + topW - r + pad, halfH + pad);
    s.quadraticCurveTo(sx + topW + pad, halfH + pad, sx + topW + pad, halfH - r - pad);
    s.lineTo(sx + topW + pad, halfH - stroke + r + pad);
    s.quadraticCurveTo(sx + topW + pad, halfH - stroke - pad, sx + topW - r + pad, halfH - stroke - pad);
    s.lineTo(sx + stroke + r + pad, halfH - stroke - pad);
    s.quadraticCurveTo(sx + stroke - pad, halfH - stroke - pad, sx + stroke - pad, halfH - stroke - r - pad);
    s.lineTo(sx + stroke - pad, stroke + r + pad);
    s.quadraticCurveTo(sx + stroke - pad, stroke - pad, sx + stroke + r + pad, stroke - pad);
    s.lineTo(sx + midW - r + pad, stroke - pad);
    s.quadraticCurveTo(sx + midW + pad, stroke - pad, sx + midW + pad, stroke - r - pad);
    s.lineTo(sx + midW + pad, -stroke + r + pad);
    s.quadraticCurveTo(sx + midW + pad, -stroke - pad, sx + midW - r + pad, -stroke - pad);
    s.lineTo(sx + stroke + r + pad, -stroke - pad);
    s.quadraticCurveTo(sx + stroke - pad, -stroke - pad, sx + stroke - pad, -stroke - r - pad);
    s.lineTo(sx + stroke - pad, -halfH + r - pad);
    s.quadraticCurveTo(sx + stroke - pad, -halfH - pad, sx - pad, -halfH - pad);
    return new THREE.ShapeGeometry(s);
  }, []);

  useFrame((state) => {
    if (meshRef.current) {
      const mx = (state.mouse.x || 0) * 0.5;
      const my = (state.mouse.y || 0) * 0.3;
      meshRef.current.rotation.y += 0.003;
      meshRef.current.rotation.x += (my - meshRef.current.rotation.x) * 0.02;
      meshRef.current.rotation.y += (mx * 0.5 - meshRef.current.rotation.y) * 0.01;
    }
    if (glowRef.current) {
      glowRef.current.rotation.copy(meshRef.current?.rotation || new THREE.Euler());
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.15} floatIntensity={0.3}>
      <group>
        {/* Background glow */}
        <mesh ref={glowRef as any} geometry={glowGeo} position={[0, 0, -0.5]}>
          <meshBasicMaterial color="#7c6aff" transparent opacity={0.08} side={THREE.DoubleSide} />
        </mesh>

        {/* Main F shape */}
        <mesh ref={meshRef} geometry={geo} position={[0, 0, -0.3]}>
          <meshPhysicalMaterial
            color="#e8e0ff"
            metalness={0.0}
            roughness={0.12}
            clearcoat={1.0}
            clearcoatRoughness={0.04}
            transparent
            opacity={0.65}
            envMapIntensity={1.0}
            specularIntensity={1.8}
            specularColor="#eeddff"
            sheen={0.3}
            sheenRoughness={0.4}
            sheenColor="#c8b8ff"
          />
        </mesh>

        {/* Edge glow lines */}
        <lineSegments geometry={new THREE.EdgesGeometry(geo)} position={[0, 0, -0.3]}>
          <lineBasicMaterial color="#ccbbff" transparent opacity={0.35} />
        </lineSegments>

        {/* Floating particles */}
        <Particles count={50} />
      </group>
    </Float>
  );
}

export function InteractiveLogo() {
  return (
    <div className="w-full aspect-square max-w-[420px] mx-auto cursor-grab active:cursor-grabbing select-none">
      <Canvas
        camera={{ position: [0, 0.1, 9], fov: 35 }}
        gl={{ alpha: true, antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.3 }}
        dpr={[1, 2]}
      >
        <ambientLight intensity={0.4} color="#6666aa" />
        <directionalLight position={[3, 2, 5]} intensity={4} color="#ffffff" />
        <directionalLight position={[-3, 2, -3]} intensity={3.5} color="#c8c0ff" />
        <directionalLight position={[0, -3, 2]} intensity={2.5} color="#e8d0ff" />
        <pointLight position={[0, 2, 4]} intensity={2} color="#aaccff" />
        <FShape />
        <Environment preset="city" />
      </Canvas>
    </div>
  );
}

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

  // Normal map: Three.js expects Y-up normals, flip if needed
  normalMap.flipY = true;
  normalMap.colorSpace = THREE.LinearSRGBColorSpace ?? THREE.SRGBColorSpace;
  albedo.colorSpace = THREE.SRGBColorSpace;
  alphaMask.colorSpace = THREE.LinearSRGBColorSpace ?? THREE.SRGBColorSpace;

  // Match old F-logo scale — fill the full viewport
  const blockW = 4.0;
  const blockH = 4.0;
  const cornerR = 0.5;
  const hw = blockW / 2;
  const hh = blockH / 2;

  // Rounded rectangle 2D shape
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    const l = -hw + cornerR;
    const r = hw - cornerR;
    const b = -hh + cornerR;
    const t = hh - cornerR;

    s.moveTo(l, -hh);
    s.lineTo(r, -hh);
    s.quadraticCurveTo(hw, -hh, hw, b);
    s.lineTo(hw, t);
    s.quadraticCurveTo(hw, hh, r, hh);
    s.lineTo(l, hh);
    s.quadraticCurveTo(-hw, hh, -hw, t);
    s.lineTo(-hw, b);
    s.quadraticCurveTo(-hw, -hh, l, -hh);
    return s;
  }, []);

  // Deeper extrusion for substantial 3D relief
  const geo = useMemo(() => {
    return new THREE.ExtrudeGeometry(shape, {
      depth: 0.55,
      bevelEnabled: true,
      bevelThickness: 0.15,
      bevelSize: 0.12,
      bevelSegments: 4,
    });
  }, [shape]);

  // Glow silhouette
  const glowGeo = useMemo(() => {
    const s = new THREE.Shape();
    const pad = 0.35;
    const gx = -hw - pad;
    const gy = -hh - pad;
    const gw = blockW + pad * 2;
    const gh = blockH + pad * 2;
    const gr = cornerR + pad;

    const l = gx + gr;
    const r2 = gx + gw - gr;
    const b = gy + gr;
    const t = gy + gh - gr;

    s.moveTo(l, gy);
    s.lineTo(r2, gy);
    s.quadraticCurveTo(gx + gw, gy, gx + gw, b);
    s.lineTo(gx + gw, t);
    s.quadraticCurveTo(gx + gw, gy + gh, r2, gy + gh);
    s.lineTo(l, gy + gh);
    s.quadraticCurveTo(gx, gy + gh, gx, t);
    s.lineTo(gx, b);
    s.quadraticCurveTo(gx, gy, l, gy);
    return new THREE.ShapeGeometry(s);
  }, []);

  useFrame((state) => {
    if (meshRef.current) {
      const mx = (state.mouse.x || 0) * 0.4;
      const my = (state.mouse.y || 0) * 0.25;
      meshRef.current.rotation.y += (mx * 0.6 - meshRef.current.rotation.y) * 0.008;
      meshRef.current.rotation.x += (my * 0.3 - meshRef.current.rotation.x) * 0.008;
    }
    if (glowRef.current) {
      glowRef.current.rotation.copy(meshRef.current?.rotation || new THREE.Euler());
    }
  });

  return (
    <Float speed={1.2} rotationIntensity={0.08} floatIntensity={0.2}>
      <group>
        {/* Back glow silhouette */}
        <mesh ref={glowRef as any} geometry={glowGeo} position={[0, 0, -0.55]}>
          <meshBasicMaterial
            color="#8b5cf6"
            transparent
            opacity={0.07}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Inner glow behind relief */}
        <mesh position={[0, 0, -0.3]}>
          <planeGeometry args={[blockW * 0.9, blockH * 0.9]} />
          <meshBasicMaterial
            color="#b57bee"
            transparent
            opacity={0.04}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Main extruded relief */}
        <mesh ref={meshRef} geometry={geo} position={[0, 0, -0.15]}>
          <meshStandardMaterial
            map={albedo}
            alphaMap={alphaMask}
            normalMap={normalMap}
            normalScale={new THREE.Vector2(1.0, 1.0)}
            metalness={0.02}
            roughness={0.35}
            transparent
            alphaTest={0.1}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Edge wireframe */}
        <lineSegments geometry={new THREE.EdgesGeometry(geo)} position={[0, 0, -0.15]}>
          <lineBasicMaterial color="#b57bee" transparent opacity={0.15} />
        </lineSegments>
      </group>
    </Float>
  );
}

export function InteractiveLogo() {
  return (
    <div className="w-full aspect-square max-w-[420px] mx-auto cursor-grab active:cursor-grabbing select-none">
      <Canvas
        camera={{ position: [0, 0.1, 9], fov: 35 }}
        gl={{
          alpha: true,
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.15,
        }}
        dpr={[1, 2]}
      >
        <color attach="background" args={["#0a0a14"]} />

        {/* Key light — softbox from above-right */}
        <directionalLight position={[5, 5, 8]} intensity={10} color="#ffffff" />
        {/* Fill — cooler, from left */}
        <directionalLight position={[-5, 2, -3]} intensity={4} color="#d0c8ff" />
        {/* Rim — warm, from behind-below */}
        <directionalLight position={[0, -4, -5]} intensity={2.5} color="#ffd0e0" />
        {/* Top highlight */}
        <pointLight position={[0, 5, 5]} intensity={3} color="#aaccff" />
        {/* Ambient */}
        <ambientLight intensity={0.35} color="#1a1a33" />

        <OtterRelief />
      </Canvas>
    </div>
  );
}

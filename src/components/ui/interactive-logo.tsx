"use client";
import { useRef, useMemo, useCallback } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float } from "@react-three/drei";
import * as THREE from "three";

// --- Floating particles ---
function Particles({ count = 60 }: { count?: number }) {
  const ptsRef = useRef<THREE.Points>(null);
  const { positions, randoms } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const rnd = new Float32Array(count * 2); // speed, phase
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 7;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 7;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 3;
      rnd[i * 2] = 0.2 + Math.random() * 0.6;
      rnd[i * 2 + 1] = Math.random() * Math.PI * 2;
    }
    return { positions: pos, randoms: rnd };
  }, [count]);

  useFrame(({ clock }) => {
    if (!ptsRef.current) return;
    const t = clock.getElapsedTime();
    const arr = ptsRef.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      const baseY = positions[i * 3 + 1];
      arr[i * 3 + 1] = baseY + Math.sin(t * randoms[i * 2] + randoms[i * 2 + 1]) * 0.5;
    }
    ptsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ptsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={positions}
          count={count}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#d4b8f0"
        size={0.03}
        transparent
        opacity={0.5}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

// --- Background glow ring ---
function BgGlow() {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ringRef.current) return;
    const s = 1 + Math.sin(clock.getElapsedTime() * 0.6) * 0.06;
    ringRef.current.scale.setScalar(s);
  });

  const geo = useMemo(() => new THREE.RingGeometry(2.0, 3.8, 64), []);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: `
          varying vec2 vUv;
          void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
        `,
        fragmentShader: `
          varying vec2 vUv;
          void main() {
            float d = length(vUv - 0.5) * 2.0;
            float alpha = smoothstep(1.0, 0.2, d) * 0.12;
            alpha *= 0.6 + 0.4 * smoothstep(0.3, 0.7, d);
            gl_FragColor = vec4(0.71, 0.48, 0.93, alpha);
          }
        `,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    []
  );

  return <mesh ref={ringRef} geometry={geo} material={mat} position={[0, 0, -2]} />;
}

// --- F shape with enhanced sheen ---
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
      bevelSegments: 5,
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
    <Float speed={1.5} rotationIntensity={0.12} floatIntensity={0.25}>
      <mesh ref={meshRef} geometry={geo} position={[0, 0, -0.3]}>
        <meshPhysicalMaterial
          color="#f0e8ff"
          metalness={0.0}
          roughness={0.08}
          clearcoat={1.0}
          clearcoatRoughness={0.04}
          transparent
          opacity={0.55}
          envMapIntensity={1.0}
          specularIntensity={2.0}
          specularColor="#ffffff"
          sheen={0.6}
          sheenRoughness={0.2}
          sheenColor="#d4c4ff"
        />
      </mesh>
      <lineSegments geometry={new THREE.EdgesGeometry(geo)} position={[0, 0, -0.3]}>
        <lineBasicMaterial color="#ccbbff" transparent opacity={0.55} />
      </lineSegments>
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
        {/* Key light */}
        <ambientLight intensity={0.4} color="#6666aa" />
        <directionalLight position={[4, 3, 5]} intensity={4.5} color="#ffffff" />
        {/* Rim light (blue) */}
        <directionalLight position={[-4, 1, -2]} intensity={3.5} color="#99aaff" />
        {/* Bottom fill (warm purple) */}
        <directionalLight position={[0, -4, 2]} intensity={2.5} color="#ddaaff" />
        {/* Top accent */}
        <directionalLight position={[1, 5, 0]} intensity={2.0} color="#ffccff" />

        <BgGlow />
        <Particles count={80} />
        <FShape />
        <Environment preset="city" />
      </Canvas>
    </div>
  );
}

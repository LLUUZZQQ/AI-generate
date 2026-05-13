"use client";
import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, useTexture } from "@react-three/drei";
import * as THREE from "three";

function OtterRelief() {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  // Load high-quality assets: albedo + alpha mask + normal map
  const [albedo, alphaMask, normalMap] = useTexture([
    "/otters/albedo.png",
    "/otters/alpha-mask.png",
    "/otters/normal.png",
  ]);

  // Make alpha mask transparent (white = opaque, black = transparent)
  alphaMask.flipY = false;

  const w = 2.6;
  const h = 2.6;
  const r = 0.35;
  const sx = -w / 2;
  const sy = -h / 2;

  // Rounded rectangle shape
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    const x1 = sx + r;
    const x2 = sx + w - r;
    const y1 = sy + r;
    const y2 = sy + h - r;

    s.moveTo(x1, sy);
    s.lineTo(x2, sy);
    s.quadraticCurveTo(sx + w, sy, sx + w, y1);
    s.lineTo(sx + w, y2);
    s.quadraticCurveTo(sx + w, sy + h, x2, sy + h);
    s.lineTo(x1, sy + h);
    s.quadraticCurveTo(sx, sy + h, sx, y2);
    s.lineTo(sx, y1);
    s.quadraticCurveTo(sx, sy, x1, sy);
    return s;
  }, []);

  // Extruded 3D block with rounded bevel
  const geometry = useMemo(() => {
    return new THREE.ExtrudeGeometry(shape, {
      depth: 0.45,
      bevelEnabled: true,
      bevelThickness: 0.12,
      bevelSize: 0.1,
      bevelSegments: 5,
    });
  }, [shape]);

  // Glow ring behind the block
  const glowGeo = useMemo(() => {
    const s = new THREE.Shape();
    const pad = 0.3;
    const gx = sx - pad;
    const gy = sy - pad;
    const gw = w + pad * 2;
    const gh = h + pad * 2;
    const gr = r + pad;
    const gx1 = gx + gr;
    const gx2 = gx + gw - gr;
    const gy1 = gy + gr;
    const gy2 = gy + gh - gr;

    s.moveTo(gx1, gy);
    s.lineTo(gx2, gy);
    s.quadraticCurveTo(gx + gw, gy, gx + gw, gy1);
    s.lineTo(gx + gw, gy2);
    s.quadraticCurveTo(gx + gw, gy + gh, gx2, gy + gh);
    s.lineTo(gx1, gy + gh);
    s.quadraticCurveTo(gx, gy + gh, gx, gy2);
    s.lineTo(gx, gy1);
    s.quadraticCurveTo(gx, gy, gx1, gy);
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
        {/* Back glow ring */}
        <mesh ref={glowRef as any} geometry={glowGeo} position={[0, 0, -0.6]}>
          <meshBasicMaterial
            color="#b57bee"
            transparent
            opacity={0.06}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Inset glow plane behind the block */}
        <mesh position={[0, 0, -0.35]} scale={[0.92, 0.92, 1]}>
          <planeGeometry args={[w, h]} />
          <meshBasicMaterial
            color="#8b5cf6"
            transparent
            opacity={0.04}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Main 3D extruded relief block */}
        <mesh ref={meshRef} geometry={geometry} position={[0, 0, -0.2]}>
          <meshStandardMaterial
            map={albedo}
            alphaMap={alphaMask}
            normalMap={normalMap}
            normalScale={new THREE.Vector2(1.0, 1.0)}
            metalness={0.02}
            roughness={0.35}
            transparent
            side={THREE.FrontSide}
          />
        </mesh>

        {/* Edge highlight lines */}
        <lineSegments
          geometry={new THREE.EdgesGeometry(geometry)}
          position={[0, 0, -0.2]}
        >
          <lineBasicMaterial
            color="#b57bee"
            transparent
            opacity={0.2}
          />
        </lineSegments>
      </group>
    </Float>
  );
}

export function InteractiveLogo() {
  return (
    <div className="w-full aspect-square max-w-[420px] mx-auto cursor-grab active:cursor-grabbing select-none">
      <Canvas
        camera={{ position: [0, 0.15, 7.5], fov: 38 }}
        gl={{
          alpha: true,
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.15,
        }}
        dpr={[1, 2]}
        style={{ background: "transparent" }}
      >
        {/* Dark studio environment */}
        <color attach="background" args={["#0a0a14"]} />

        {/* Key light — main white softbox from top-right */}
        <directionalLight position={[5, 4, 7]} intensity={9} color="#ffffff" />
        {/* Fill light — cool purple from left */}
        <directionalLight position={[-4, 2, -3]} intensity={3.5} color="#c8c0ff" />
        {/* Rim light — warm from behind/below */}
        <directionalLight position={[0, -3, -4]} intensity={2} color="#ffd0e0" />
        {/* Top accent */}
        <pointLight position={[0, 4, 5]} intensity={3} color="#aaccff" />
        {/* Ambient fill */}
        <ambientLight intensity={0.3} color="#222244" />

        <OtterRelief />
      </Canvas>
    </div>
  );
}

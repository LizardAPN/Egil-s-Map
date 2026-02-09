"use client";

import { useRef, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Float } from "@react-three/drei";
import * as THREE from "three";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function Beacon3D({ username }: { username: string }) {
  const [data, setData] = useState<{
    current_is_star: boolean;
    tiers: { id: number; title: string; order: number; pins: unknown[] }[];
  } | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/profile/${encodeURIComponent(username)}/beacon`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ current_is_star: false, tiers: [] }));
  }, [username]);

  if (!data) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-400">
        Loading beacon...
      </div>
    );
  }

  return (
    <Canvas camera={{ position: [0, 2, 5], fov: 50 }}>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <pointLight position={[0, 5, 0]} intensity={data.current_is_star ? 2 : 1} color="#fbbf24" />
      <BeaconTower tiers={data.tiers} isStar={data.current_is_star} />
      <OrbitControls enableZoom enablePan />
    </Canvas>
  );
}

function BeaconTower({
  tiers,
  isStar,
}: {
  tiers: { id: number; title: string; order: number }[];
  isStar: boolean;
}) {
  const group = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.2;
  });

  const segs = tiers.length || 1;
  const height = 0.3;

  return (
    <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
      <group ref={group}>
        {Array.from({ length: segs }).map((_, i) => (
          <mesh
            key={i}
            position={[0, i * height + height / 2, 0]}
            castShadow
            receiveShadow
          >
            <cylinderGeometry args={[0.15, 0.2, height, 8]} />
            <meshStandardMaterial
              color={isStar ? "#fbbf24" : "#f59e0b"}
              emissive={isStar ? "#fbbf24" : "#92400e"}
              emissiveIntensity={isStar ? 0.5 : 0.2}
            />
          </mesh>
        ))}
      </group>
    </Float>
  );
}

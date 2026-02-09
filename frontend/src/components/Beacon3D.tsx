"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Float } from "@react-three/drei";
import * as THREE from "three";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type BeaconTier = {
  id: number;
  title: string;
  order: number;
  pins: { id: number; lat: number; lng: number; content_type: string }[];
  chapter_summary?: string | null;
};

type BeaconData = {
  current_is_star: boolean;
  tiers: BeaconTier[];
};

type Beacon3DProps = {
  username: string;
  data?: BeaconData | null;
  onTierSelect?: (tierId: number) => void;
};

export default function Beacon3D({ username, data: dataProp, onTierSelect }: Beacon3DProps) {
  const [fetchedData, setFetchedData] = useState<BeaconData | null>(null);
  const data = dataProp ?? fetchedData;

  useEffect(() => {
    if (dataProp != null) return;
    fetch(`${API_BASE}/profile/${encodeURIComponent(username)}/beacon`)
      .then((r) => r.json())
      .then(setFetchedData)
      .catch(() => setFetchedData({ current_is_star: false, tiers: [] }));
  }, [username, dataProp]);

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
      <BeaconTower
        tiers={data.tiers}
        isStar={data.current_is_star}
        onTierSelect={onTierSelect}
      />
      <OrbitControls enableZoom enablePan />
    </Canvas>
  );
}

const BeaconTower = ({
  tiers,
  isStar,
  onTierSelect,
}: {
  tiers: BeaconTier[];
  isStar: boolean;
  onTierSelect?: (tierId: number) => void;
}) => {
  const group = useRef<THREE.Group>(null);
  const targetRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0.15, 0));

  const segs = tiers.length || 1;
  const height = 0.3;

  useFrame((state, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.2;
    const controls = (state.controls as { target?: THREE.Vector3 } | undefined) as
      | { target: THREE.Vector3 }
      | undefined;
    if (controls?.target) {
      controls.target.lerp(targetRef.current, 0.05);
    }
  });

  const handleTierClick = useCallback(
    (tierId: number, index: number) => (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      targetRef.current.set(0, index * height + height / 2, 0);
      onTierSelect?.(tierId);
    },
    [onTierSelect, height]
  );

  return (
    <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
      <group ref={group}>
        {(tiers.length ? tiers : [{ id: 0, title: "Empty", order: 0, pins: [] }]).map((tier, i) => (
          <TierSegment
            key={tier.id}
            tier={tier}
            index={i}
            height={height}
            isStar={isStar}
            onClick={handleTierClick(tier.id, i)}
          />
        ))}
      </group>
    </Float>
  );
};

const TierSegment = React.memo(
  ({
    tier,
    index,
    height,
    isStar,
    onClick,
  }: {
    tier: BeaconTier;
    index: number;
    height: number;
    isStar: boolean;
    onClick: (e: ThreeEvent<MouseEvent>) => void;
  }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const materialRef = useRef<THREE.MeshStandardMaterial>(null);

    const topRadius = 0.12 + (index * 0.02);
    const bottomRadius = 0.16 + (index * 0.02);

    useFrame((_, delta) => {
      if (!materialRef.current) return;
      const pulse = 0.15 + 0.1 * Math.sin(Date.now() * 0.002 + index);
      materialRef.current.emissiveIntensity = isStar ? 0.3 + pulse * 0.4 : pulse;
    });

    return (
      <mesh
        ref={meshRef}
        position={[0, index * height + height / 2, 0]}
        castShadow
        receiveShadow
        onClick={onClick}
      >
        <cylinderGeometry args={[topRadius, bottomRadius, height, 8]} />
        <meshStandardMaterial
          ref={materialRef}
          color={isStar ? "#fbbf24" : "#f59e0b"}
          emissive={isStar ? "#fbbf24" : "#92400e"}
          emissiveIntensity={isStar ? 0.5 : 0.2}
        />
      </mesh>
    );
  }
);

TierSegment.displayName = "TierSegment";

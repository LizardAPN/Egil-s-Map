"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Float as FloatComponent } from "@react-three/drei";
import * as THREE from "three";

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

type BeaconSceneProps = {
  username: string;
  data?: BeaconData | null;
  onTierSelect?: (tierId: number) => void;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/* Rough dark stone RGB for PBR */
const STONE_COLOR = "#2a2a2a";
const STONE_ROUGHNESS = 0.9;
const STONE_METALNESS = 0.1;

/* Forged cold iron for rings */
const IRON_COLOR = "#3d4a52";
const IRON_ROUGHNESS = 0.4;
const IRON_METALNESS = 0.85;

/* Magical core glow */
const CORE_COLOR = "#FFD700";
const CORE_EMISSIVE = "#FFD700";

export default function BeaconScene({ username, data: dataProp, onTierSelect }: BeaconSceneProps) {
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
      <div className="w-full h-full flex items-center justify-center text-gray-400 font-special-elite">
        Loading beacon...
      </div>
    );
  }

  return (
    <Canvas camera={{ position: [0, 2, 5], fov: 50 }}>
      <ambientLight intensity={0.25} />
      <directionalLight position={[5, 5, 5]} intensity={1.2} castShadow />
      <pointLight position={[0, 5, 0]} intensity={data.current_is_star ? 2.5 : 1} color="#fbbf24" />
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
    const controls = (state.controls as { target?: THREE.Vector3 } | undefined) as { target: THREE.Vector3 } | undefined;
    if (controls?.target) {
      controls.target.lerp(targetRef.current, 0.05);
    }
  });

  const handleTierClick = useCallback(
    (tierId: number, index: number) => (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      const y = index * height + height / 2;
      targetRef.current.set(0, y, 0);
      onTierSelect?.(tierId);
    },
    [onTierSelect, height]
  );

  return (
    <FloatComponent speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
        <group ref={group}>
          {/* Magical Core: central glowing cylinder that pulses */}
          <MagicalCore isStar={isStar} height={segs * height} />
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
      </FloatComponent>
  );
};

/* Magical Core: central golden emissive cylinder */
function MagicalCore({ isStar, height }: { isStar: boolean; height: number }) {
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((_, delta) => {
    if (!matRef.current) return;
    const pulse = 0.6 + 0.4 * Math.sin(Date.now() * 0.003);
    matRef.current.opacity = pulse * (isStar ? 0.9 : 0.5);
  });
  return (
    <mesh position={[0, height / 2, 0]}>
      <cylinderGeometry args={[0.03, 0.03, height, 16]} />
      <meshBasicMaterial
        ref={matRef}
        color={CORE_COLOR}
        transparent
        opacity={isStar ? 0.8 : 0.5}
      />
    </mesh>
  );
}

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
    const topRadius = 0.12 + index * 0.02;
    const bottomRadius = 0.16 + index * 0.02;

    /* PBR: Rough dark stone body */
    const stoneMat = (
      <meshStandardMaterial
        color={STONE_COLOR}
        roughness={STONE_ROUGHNESS}
        metalness={STONE_METALNESS}
        emissive={isStar ? "#4a3a00" : "#1a1a1a"}
        emissiveIntensity={isStar ? 0.15 : 0.05}
      />
    );

    /* Iron ring frame around each tier */
    const ringRadius = bottomRadius + 0.02;
    const ringHeight = 0.04;

    return (
      <group position={[0, index * height + height / 2, 0]}>
        {/* Stone body */}
        <mesh ref={meshRef} castShadow receiveShadow onClick={onClick}>
          <cylinderGeometry args={[topRadius, bottomRadius, height, 8]} />
          {stoneMat}
        </mesh>
        {/* Forged cold iron ring (top) */}
        <mesh position={[0, height / 2 + ringHeight / 2, 0]} castShadow>
          <torusGeometry args={[ringRadius, ringHeight / 2, 8, 16]} />
          <meshStandardMaterial
            color={IRON_COLOR}
            roughness={IRON_ROUGHNESS}
            metalness={IRON_METALNESS}
          />
        </mesh>
      </group>
    );
  }
);

TierSegment.displayName = "TierSegment";

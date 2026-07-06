const AMBER_DOT_INDICES = new Set([6, 14, 20]);

export function OnboardingBackdrop() {
  const dots = Array.from({ length: 28 }, (_, index) => {
    const angle = (index / 27) * Math.PI;
    const x = 200 + Math.cos(angle) * 200;
    const y = 140 + Math.sin(angle) * 100;
    return { x, y, key: index, isAmber: AMBER_DOT_INDICES.has(index) };
  });

  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 400 280"
      preserveAspectRatio="xMidYMid slice"
    >
      {dots.map((dot) => (
        <circle
          key={dot.key}
          cx={dot.x}
          cy={dot.y}
          r={dot.isAmber ? 4 : 3}
          fill={dot.isAmber ? "rgba(239, 182, 90, 0.6)" : "rgba(90, 100, 138, 0.2)"}
        />
      ))}
    </svg>
  );
}

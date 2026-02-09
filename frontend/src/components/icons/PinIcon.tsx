export default function PinIcon({ size = 16, isPrivate = false }: { size?: number; isPrivate?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))" }}
    >
      {/* Ink dot/cross symbol - hand-drawn style */}
      {isPrivate ? (
        // Cross for private pins
        <>
          <line x1="8" y1="2" x2="8" y2="14" stroke="#000" strokeWidth="2" strokeLinecap="round" />
          <line x1="2" y1="8" x2="14" y2="8" stroke="#000" strokeWidth="2" strokeLinecap="round" />
        </>
      ) : (
        // Dot for public pins
        <circle cx="8" cy="8" r="4" stroke="#000" strokeWidth="1.5" fill="rgba(0,0,0,0.3)" />
      )}
    </svg>
  );
}

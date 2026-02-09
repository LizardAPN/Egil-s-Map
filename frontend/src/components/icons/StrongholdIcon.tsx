export default function StrongholdIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))" }}
    >
      {/* Tower/Castle silhouette - hand-drawn ink style */}
      <path
        d="M12 2 L14 4 L14 8 L16 8 L16 12 L18 12 L18 20 L6 20 L6 12 L8 12 L8 8 L10 8 L10 4 Z"
        stroke="#000"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="rgba(0,0,0,0.1)"
      />
      {/* Battlements */}
      <path
        d="M6 20 L6 18 M8 20 L8 18 M10 20 L10 18 M12 20 L12 18 M14 20 L14 18 M16 20 L16 18 M18 20 L18 18"
        stroke="#000"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Door */}
      <rect x="10" y="16" width="4" height="4" stroke="#000" strokeWidth="1" fill="none" />
    </svg>
  );
}

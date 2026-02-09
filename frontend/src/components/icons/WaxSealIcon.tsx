/* Wax Seal (Surguch) marker - medieval seal stamp style */
export default function WaxSealIcon({
  size = 24,
  isPrivate = false,
  isMist = false,
}: {
  size?: number;
  isPrivate?: boolean;
  isMist?: boolean;
}) {
  const fill = isMist ? "rgba(180,180,200,0.4)" : "#8B4513";
  const stroke = isMist ? "rgba(120,120,140,0.5)" : "#5D3A1A";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        filter: isMist ? "blur(0.5px)" : "drop-shadow(0 2px 4px rgba(0,0,0,0.4))",
      }}
    >
      {/* Wax seal circle */}
      <circle cx="16" cy="16" r="14" fill={fill} stroke={stroke} strokeWidth="1.5" />
      {/* Inner seal design - cross/dagger for private, dot for public */}
      {isPrivate ? (
        <>
          <line x1="16" y1="8" x2="16" y2="24" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <line x1="8" y1="16" x2="24" y2="16" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <circle cx="16" cy="16" r="2" fill={stroke} opacity={0.6} />
        </>
      ) : (
        <circle cx="16" cy="16" r="4" fill={stroke} opacity={0.8} />
      )}
    </svg>
  );
}

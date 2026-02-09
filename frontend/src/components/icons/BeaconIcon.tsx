export default function BeaconIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="beacon-flame-icon"
      style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))" }}
    >
      {/* Flame - hand-drawn ink style with flicker animation */}
      <path
        d="M12 20 C10 18, 8 16, 8 14 C8 12, 9 11, 10 10 C9 9, 8 8, 8 7 C8 5, 9 4, 10 3 C11 4, 12 5, 12 7 C12 5, 13 4, 14 3 C15 4, 16 5, 16 7 C16 8, 15 9, 14 10 C15 11, 16 12, 16 14 C16 16, 14 18, 12 20 Z"
        stroke="#000"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="rgba(0,0,0,0.2)"
        className="flame-path"
      />
      {/* Inner flame highlight */}
      <path
        d="M12 18 C11 17, 10 15, 10 14 C10 13, 11 12, 12 11 C13 12, 14 13, 14 14 C14 15, 13 17, 12 18 Z"
        fill="rgba(0,0,0,0.1)"
      />
    </svg>
  );
}

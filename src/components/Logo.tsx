// Orion mark: a geometric bow and arrow aimed at a star.
// Built from simple shapes so it stays crisp at favicon sizes.
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={3.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Bow and arrow — arrow passes through the string, tilted 45° up toward the star */}
      <g transform="translate(-1.4 1.4)">
        <g transform="translate(3 -3) rotate(-45 24 40)">
          <path d="M24 20 C 38 26 38 54 24 60" />
          <path d="M24 20 L24 60" />
        </g>
        <g transform="rotate(-45 24 40)">
          <path d="M12 40 H58" />
          <path d="M18 35 L12 40 L18 45" />
          <path d="M49 35 L58 40 L49 45 Z" fill="currentColor" stroke="none" />
        </g>
        {/* Star */}
        <path
          d="M52 7 L53.4 10.6 L57 12 L53.4 13.4 L52 17 L50.6 13.4 L47 12 L50.6 10.6 Z"
          fill="#fbbf24"
          stroke="none"
        />
      </g>
    </svg>
  );
}

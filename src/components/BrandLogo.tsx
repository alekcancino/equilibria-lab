import { useId } from 'react';

/**
 * Equilibria Lab — "species crossover + node" brand mark.
 * Two distribution curves (α) crossing, with a ring node at the crossover point
 * (α = 0.5 at pKa / equivalence point). Placed on a tile with the app's
 * indigo→violet gradient, so it works equally as a favicon/icon.
 */
export default function BrandLogo({ size = 32, className }: { size?: number; className?: string }) {
  const uid = useId().replace(/:/g, '');
  const tile = `eq-tile-${uid}`;
  const sheen = `eq-sheen-${uid}`;

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={tile} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="55%" stopColor="#7A6BF5" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
        <radialGradient id={sheen} cx="30%" cy="16%" r="85%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.26" />
          <stop offset="55%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill={`url(#${tile})`} />
      <rect width="40" height="40" rx="11" fill={`url(#${sheen})`} />
      <path
        d="M7 13 C15 13, 16 20, 20 20 S25 27, 33 27"
        stroke="#fff"
        strokeWidth="2.7"
        strokeLinecap="round"
      />
      <path
        d="M7 27 C15 27, 16 20, 20 20 S25 13, 33 13"
        stroke="#fff"
        strokeWidth="2.1"
        strokeLinecap="round"
        opacity="0.55"
      />
      <circle cx="20" cy="20" r="3.4" fill={`url(#${tile})`} stroke="#fff" strokeWidth="2" />
    </svg>
  );
}

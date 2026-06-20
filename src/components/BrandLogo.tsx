import { useId } from 'react';

/**
 * Equilibrio ⇌ — como el símbolo químico:
 * flecha superior → (arco suave hacia arriba) y flecha inferior ← (arco suave hacia abajo),
 * desplazadas en sentidos opuestos.
 */
export default function BrandLogo({ size = 34, className }: { size?: number; className?: string }) {
  const uid = useId().replace(/:/g, '');
  const topGrad = `eq-top-${uid}`;
  const botGrad = `eq-bot-${uid}`;

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
        <linearGradient id={topGrad} x1="8" y1="13" x2="33" y2="13" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#818CF8" />
          <stop offset="100%" stopColor="#6366F1" />
        </linearGradient>
        <linearGradient id={botGrad} x1="32" y1="27" x2="7" y2="27" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#4F46E5" />
        </linearGradient>
      </defs>
      <path
        d="M 8 15 Q 20 9.5 32 13 M 28 10 L 33.5 13 L 28 16"
        stroke={`url(#${topGrad})`}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 32 25 Q 20 30.5 8 27 M 12 24 L 6.5 27 L 12 30"
        stroke={`url(#${botGrad})`}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
